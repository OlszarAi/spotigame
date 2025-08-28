import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent self-voting
    if (guessedUserId === user.id) {
      return NextResponse.json({ error: 'You cannot guess yourself!' }, { status: 400 })
    }

    // Get game and current round
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        rounds: {
          where: { roundNumber: { lte: 1 } }, // For now, just get round 1
          orderBy: { roundNumber: 'asc' }
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

    // Check if user already voted for this round
    const existingVote = await prisma.vote.findUnique({
      where: { 
        roundId_voterId: {
          roundId: currentRound.id,
          voterId: user.id
        }
      }
    })

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted for this round' }, { status: 400 })
    }

    // Create vote
    await prisma.vote.create({
      data: {
        roundId: currentRound.id,
        voterId: user.id,
        guessedUserId: guessedUserId
      }
    })

    // Check if all players have voted
    const totalParticipants = await prisma.gameParticipant.count({
      where: { gameId: game.id }
    })

    const totalVotes = await prisma.vote.count({
      where: { roundId: currentRound.id }
    })

    // If all players have voted, end the round
    if (totalVotes >= totalParticipants) {
      // Get all votes for scoring
      const votes = await prisma.vote.findMany({
        where: { roundId: currentRound.id },
        include: { voter: true }
      })

      // Calculate scores - players get points for correct guesses
      for (const vote of votes) {
        if (vote.guessedUserId === currentRound.ownerId) {
          // Correct guess - award points
          await prisma.gameParticipant.update({
            where: {
              gameId_userId: {
                gameId: game.id,
                userId: vote.voterId
              }
            },
            data: {
              score: { increment: 10 }
            }
          })
        }
      }

      // Mark round as finished
      await prisma.round.update({
        where: { id: currentRound.id },
        data: { 
          status: 'FINISHED',
          endedAt: new Date()
        }
      })

      // Check if this was the last round
      if (game.currentRound >= game.totalRounds) {
        // Game finished
        await prisma.game.update({
          where: { id: game.id },
          data: { status: 'FINISHED' }
        })

        // Get final scores
        const finalScores = await prisma.gameParticipant.findMany({
          where: { gameId: game.id },
          include: { user: true },
          orderBy: { score: 'desc' }
        })

        await pusherServer.trigger(`game-${game.id}`, 'game-ended', {
          finalScores
        })
      } else {
        // Start next round
        const nextRoundNumber = game.currentRound + 1
        await prisma.game.update({
          where: { id: game.id },
          data: { currentRound: nextRoundNumber }
        })

        const nextRound = await prisma.round.findFirst({
          where: { 
            gameId: game.id,
            roundNumber: nextRoundNumber
          }
        })

        if (nextRound) {
          await prisma.round.update({
            where: { id: nextRound.id },
            data: { startedAt: new Date() }
          })

          setTimeout(() => {
            pusherServer.trigger(`game-${game.id}`, 'round-started', {
              round: nextRound
            })
          }, 3000) // 3 second delay before next round
        }
      }

      // Emit round ended event
      await pusherServer.trigger(`game-${game.id}`, 'round-ended', {
        results: {
          correctAnswer: currentRound.ownerId,
          votes: votes.map((v: any) => ({
            voter: v.voter.name,
            guess: v.guessedUserId
          }))
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
