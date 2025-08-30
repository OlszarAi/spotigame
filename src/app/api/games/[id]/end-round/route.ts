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

    // Get game
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        rounds: {
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

    if (currentRound.status === 'FINISHED') {
      return NextResponse.json({ error: 'Round already finished' }, { status: 400 })
    }

    // Get all votes for this round
    const votes = await prisma.vote.findMany({
      where: { roundId: currentRound.id },
      include: { voter: true }
    })

    // Calculate scores for players who voted correctly
    for (const vote of votes) {
      if (vote.guessedUserId === currentRound.ownerId) {
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

        // For Vercel serverless - trigger round start with delay data
        // instead of using setTimeout which doesn't work reliably
        await pusherServer.trigger(`game-${game.id}`, 'round-will-start', {
          round: nextRound,
          delaySeconds: 5
        })
      }
    }

    // Emit round ended event - MUST be awaited for Vercel
    await pusherServer.trigger(`game-${game.id}`, 'round-ended', {
      results: {
        correctAnswer: currentRound.ownerId,
        votes: votes.map((v: any) => ({
          voter: v.voter.name,
          guess: v.guessedUserId,
          isCorrect: v.guessedUserId === currentRound.ownerId
        }))
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error ending round:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
