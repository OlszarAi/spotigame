import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get game session for this lobby
    const gameSession = await prisma.gameSession.findFirst({
      where: { lobbyId: id },
      include: {
        playerScores: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            totalScore: 'desc'
          }
        }
      }
    })

    if (!gameSession) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }

    const scores = gameSession.playerScores.map(score => ({
      user_id: score.userId,
      username: score.user.name || 'Unknown',
      total_score: score.totalScore
    }))

    return NextResponse.json({ scores })
  } catch (error) {
    console.error('Error fetching scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
