import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

// Cache for vote status to reduce DB queries
const voteCache = new Map<string, boolean>()
const CACHE_TTL = 5000 // 5 seconds

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[vote] Starting vote submission for game ${params.id}`)
    
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guessedUserId } = await req.json()
    
    if (!guessedUserId) {
      return NextResponse.json({ error: 'Guessed user ID is required' }, { status: 400 })
    }

    console.log(`[vote] User ${(session as any).user.email} voting for ${guessedUserId} in game ${params.id}`)

    // Single query to get user, game, and current round
    const user = await prisma.user.findUnique({
      where: { email: (session as any).user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get game with current round in single query
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        rounds: {
          where: { roundNumber: { gte: 0 } }, // Get all rounds
          orderBy: { roundNumber: 'asc' }
        },
        participants: {
          select: { userId: true }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 })
    }

    const currentRound = game.rounds.find((r: any) => r.roundNumber === game.currentRound)
    
    if (!currentRound) {
      return NextResponse.json({ error: 'No active round' }, { status: 400 })
    }

    console.log(`[vote] Current round: ${currentRound.id}, round number: ${game.currentRound}`)

    // Check cache first
    const cacheKey = `${currentRound.id}-${user.id}`
    if (voteCache.has(cacheKey)) {
      return NextResponse.json({ error: 'You have already voted for this round' }, { status: 400 })
    }

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx: any) => {
      // Check if user already voted
      const existingVote = await tx.vote.findUnique({
        where: { 
          roundId_voterId: {
            roundId: currentRound.id,
            voterId: user.id
          }
        }
      })

      if (existingVote) {
        // Cache the result
        voteCache.set(cacheKey, true)
        setTimeout(() => voteCache.delete(cacheKey), CACHE_TTL)
        throw new Error('Already voted')
      }

      // Create vote
      const vote = await tx.vote.create({
        data: {
          roundId: currentRound.id,
          voterId: user.id,
          guessedUserId: guessedUserId
        }
      })

      // Cache the vote
      voteCache.set(cacheKey, true)
      setTimeout(() => voteCache.delete(cacheKey), CACHE_TTL)

      // Check total votes efficiently
      const totalVotes = await tx.vote.count({
        where: { roundId: currentRound.id }
      })

      return {
        vote,
        totalVotes,
        totalParticipants: game.participants.length
      }
    })

    console.log(`[vote] Vote successful. Total votes: ${result.totalVotes}/${result.totalParticipants}`)

    // Immediate response to user
    const response = NextResponse.json({ 
      success: true, 
      hasVoted: true,
      voteCount: result.totalVotes,
      totalPlayers: result.totalParticipants
    })

    // Process round ending synchronously if all voted - crucial for Vercel
    if (result.totalVotes >= result.totalParticipants) {
      console.log(`[vote] All players voted, processing round end`)
      try {
        // IMPORTANT: await this for Vercel serverless functions
        await processRoundEnd(game.id, currentRound.id, game.currentRound, game.totalRounds)
        console.log(`[vote] Round end processing completed successfully`)
      } catch (error) {
        console.error('[vote] Error processing round end:', error)
        // Don't fail the vote even if round end processing fails
      }
    }

    return response

  } catch (error: any) {
    if (error.message === 'Already voted') {
      return NextResponse.json({ error: 'You have already voted for this round' }, { status: 400 })
    }
    console.error(`[vote] Error submitting vote for game ${params.id}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Async function to handle round ending
async function processRoundEnd(gameId: string, roundId: string, currentRoundNumber: number, totalRounds: number) {
  try {
    console.log(`[processRoundEnd] Starting for game ${gameId}, round ${roundId}, round number ${currentRoundNumber}/${totalRounds}`)
    
    // Check if round is already finished
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      select: { status: true, ownerId: true }
    })
    
    if (round?.status === 'FINISHED') {
      console.log(`[processRoundEnd] Round ${roundId} already finished, skipping`)
      return
    }

    console.log(`[processRoundEnd] Round ${roundId} owner: ${round?.ownerId}`)

    // Get all votes for scoring in single query
    const votes = await prisma.vote.findMany({
      where: { roundId: roundId },
      include: { 
        voter: { 
          select: { id: true, name: true } 
        } 
      }
    })

    console.log(`[processRoundEnd] Found ${votes.length} votes for round ${roundId}`)

    // Batch update scores
    const correctVotes = votes.filter((v: any) => v.guessedUserId === round?.ownerId)
    console.log(`[processRoundEnd] ${correctVotes.length} correct votes out of ${votes.length}`)
    
    if (correctVotes.length > 0) {
      await prisma.gameParticipant.updateMany({
        where: {
          gameId: gameId,
          userId: { in: correctVotes.map((v: any) => v.voterId) }
        },
        data: {
          score: { increment: 10 }
        }
      })
      console.log(`[processRoundEnd] Updated scores for ${correctVotes.length} players`)
    }

    // Mark round as finished
    await prisma.round.update({
      where: { id: roundId },
      data: { 
        status: 'FINISHED',
        endedAt: new Date()
      }
    })
    console.log(`[processRoundEnd] Marked round ${roundId} as FINISHED`)

    // Check if game finished
    if (currentRoundNumber >= totalRounds) {
      console.log(`[processRoundEnd] Game ${gameId} finished (round ${currentRoundNumber}/${totalRounds})`)
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'FINISHED' }
      })

      const finalScores = await prisma.gameParticipant.findMany({
        where: { gameId: gameId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { score: 'desc' }
      })

      console.log(`[processRoundEnd] Triggering game-ended event for game ${gameId}`)
      await pusherServer.trigger(`game-${gameId}`, 'game-ended', {
        finalScores
      })
    } else {
      // Start next round
      const nextRoundNumber = currentRoundNumber + 1
      console.log(`[processRoundEnd] Starting next round ${nextRoundNumber} for game ${gameId}`)
      
      await prisma.game.update({
        where: { id: gameId },
        data: { currentRound: nextRoundNumber }
      })

      const nextRound = await prisma.round.findFirst({
        where: { 
          gameId: gameId,
          roundNumber: nextRoundNumber
        }
      })

      if (nextRound) {
        await prisma.round.update({
          where: { id: nextRound.id },
          data: { startedAt: new Date() }
        })

        console.log(`[processRoundEnd] Triggering round-will-start event for game ${gameId}, round ${nextRound.id}`)
        // For Vercel serverless - trigger round start immediately with delay data
        // instead of using setTimeout which doesn't work reliably
        await pusherServer.trigger(`game-${gameId}`, 'round-will-start', {
          round: nextRound,
          delaySeconds: 3
        })
      }
    }

    console.log(`[processRoundEnd] Triggering round-ended event for game ${gameId}`)
    // Emit round ended event - MUST be awaited for Vercel
    await pusherServer.trigger(`game-${gameId}`, 'round-ended', {
      results: {
        correctAnswer: round?.ownerId,
        votes: votes.map((v: any) => ({
          voter: v.voter.name,
          guess: v.guessedUserId,
          isCorrect: v.guessedUserId === round?.ownerId
        }))
      }
    })

    console.log(`[processRoundEnd] Completed successfully for game ${gameId}`)

  } catch (error) {
    console.error(`[processRoundEnd] Error in processRoundEnd for game ${gameId}:`, error)
    throw error // Re-throw so caller knows it failed
  }
}
