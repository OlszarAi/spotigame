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
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guessedUserId } = await req.json()
    
    if (!guessedUserId) {
      return NextResponse.json({ error: 'Guessed user ID is required' }, { status: 400 })
    }

    // Single query to get user, game, and current round
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
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

    // Immediate response to user
    const response = NextResponse.json({ 
      success: true, 
      hasVoted: true,
      voteCount: result.totalVotes,
      totalPlayers: result.totalParticipants
    })

    // Process round ending asynchronously if all voted
    if (result.totalVotes >= result.totalParticipants) {
      // Don't await this - let it run in background
      processRoundEnd(game.id, currentRound.id, game.currentRound, game.totalRounds)
        .catch(error => {
          console.error('Error processing round end:', error)
        })
    }

    return response

  } catch (error: any) {
    if (error.message === 'Already voted') {
      return NextResponse.json({ error: 'You have already voted for this round' }, { status: 400 })
    }
    console.error('Error submitting vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Async function to handle round ending
async function processRoundEnd(gameId: string, roundId: string, currentRoundNumber: number, totalRounds: number) {
  try {
    // Check if round is already finished
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      select: { status: true, ownerId: true }
    })
    
    if (round?.status === 'FINISHED') {
      return
    }

    // Get all votes for scoring in single query
    const votes = await prisma.vote.findMany({
      where: { roundId: roundId },
      include: { 
        voter: { 
          select: { id: true, name: true } 
        } 
      }
    })

    // Batch update scores
    const correctVotes = votes.filter((v: any) => v.guessedUserId === round?.ownerId)
    
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
    }

    // Mark round as finished
    await prisma.round.update({
      where: { id: roundId },
      data: { 
        status: 'FINISHED',
        endedAt: new Date()
      }
    })

    // Check if game finished
    if (currentRoundNumber >= totalRounds) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'FINISHED' }
      })

      const finalScores = await prisma.gameParticipant.findMany({
        where: { gameId: gameId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { score: 'desc' }
      })

      await pusherServer.trigger(`game-${gameId}`, 'game-ended', {
        finalScores
      })
    } else {
      // Start next round
      const nextRoundNumber = currentRoundNumber + 1
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

        // Delay next round start
        setTimeout(async () => {
          try {
            await pusherServer.trigger(`game-${gameId}`, 'round-started', {
              round: nextRound
            })
          } catch (error) {
            console.error('Error triggering round-started:', error)
          }
        }, 3000)
      }
    }

    // Emit round ended event
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

  } catch (error) {
    console.error('Error in processRoundEnd:', error)
  }
}
