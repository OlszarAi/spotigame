import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        rounds: {
          orderBy: {
            roundNumber: 'asc'
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Get current round
    const currentRound = game.rounds.find((round: any) => 
      round.roundNumber === game.currentRound
    )

    console.log(`Fetching game ${params.id} data:`)
    console.log(`Current round: ${game.currentRound}`)
    console.log(`Participants with scores:`, game.participants.map((p: any) => ({ 
      name: p.user.name, 
      score: p.score 
    })))

    return NextResponse.json({
      ...game,
      currentRound: currentRound || null
    })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
