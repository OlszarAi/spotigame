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

    // Get comprehensive game state
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            votes: {
              include: {
                voter: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const currentRound = game.rounds.find((r: any) => r.roundNumber === game.currentRound)
    
    const debugInfo = {
      gameId: game.id,
      status: game.status,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      participantCount: game.participants.length,
      currentRoundDetails: currentRound ? {
        id: currentRound.id,
        roundNumber: currentRound.roundNumber,
        status: currentRound.status,
        ownerId: currentRound.ownerId,
        voteCount: currentRound.votes.length,
        votes: currentRound.votes.map((v: any) => ({
          voterId: v.voterId,
          voterName: v.voter.name,
          guessedUserId: v.guessedUserId
        }))
      } : null,
      allRounds: game.rounds.map((r: any) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        status: r.status,
        voteCount: r.votes.length
      })),
      participants: game.participants.map((p: any) => ({
        userId: p.user.id,
        name: p.user.name,
        score: p.score
      }))
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('Error getting game debug info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
