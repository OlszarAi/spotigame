import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

// Emergency endpoint to force next round if stuck
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

    // Check if this is the last round
    if (game.currentRound >= game.totalRounds) {
      // End the game
      await prisma.game.update({
        where: { id: game.id },
        data: { status: 'FINISHED' }
      })

      const finalScores = await prisma.gameParticipant.findMany({
        where: { gameId: game.id },
        include: { user: true },
        orderBy: { score: 'desc' }
      })

      await pusherServer.trigger(`game-${game.id}`, 'game-ended', {
        finalScores
      })

      return NextResponse.json({ success: true, gameEnded: true })
    }

    // Force next round
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

      // Trigger round start
      await pusherServer.trigger(`game-${game.id}`, 'round-started', {
        round: nextRound
      })
    }

    return NextResponse.json({ success: true, nextRound: nextRoundNumber })
  } catch (error) {
    console.error('Error forcing next round:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
