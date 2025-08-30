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

    // Get all votes for this round
    const votes = await prisma.vote.findMany({
      where: { roundId: currentRound.id },
      include: { 
        voter: { 
          select: { id: true, name: true } 
        } 
      }
    })

    // Trigger round-ended event manually
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

    return NextResponse.json({ 
      success: true, 
      message: 'Round ended event triggered',
      voteCount: votes.length,
      roundId: currentRound.id
    })
  } catch (error) {
    console.error('Error triggering round ended:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
