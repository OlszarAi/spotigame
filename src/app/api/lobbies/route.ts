import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { DatabaseCleanupService } from '@/lib/cleanup-service'

export async function POST(req: NextRequest) {
  try {
    // Perform cleanup occasionally (10% chance) to avoid performance impact
    if (Math.random() < 0.1) {
      const cleanupService = DatabaseCleanupService.getInstance()
      cleanupService.performCleanup().catch(error => {
        console.error('Background cleanup failed:', error)
      })
    }

    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, maxPlayers, roundCount, gameMode = 'SONGS', timeRange = 'SHORT_TERM' } = await req.json()

    // Validate gameMode
    if (!['SONGS', 'ARTISTS'].includes(gameMode)) {
      return NextResponse.json({ error: 'Invalid game mode' }, { status: 400 })
    }

    // Validate timeRange
    if (!['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'].includes(timeRange)) {
      return NextResponse.json({ error: 'Invalid time range. Must be SHORT_TERM, MEDIUM_TERM, or LONG_TERM' }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create lobby
    const lobby = await prisma.lobby.create({
      data: {
        name,
        hostId: user.id,
        maxPlayers,
        roundCount,
        gameMode,
        timeRange,
      },
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        }
      }
    })

    // Add host as member
    await prisma.lobbyMember.create({
      data: {
        userId: user.id,
        lobbyId: lobby.id,
        isReady: true, // Host is automatically ready
      }
    })

    // Fetch lobby with updated members
    const updatedLobby = await prisma.lobby.findUnique({
      where: { id: lobby.id },
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        }
      }
    })

    // Trigger Pusher event
    await pusherServer.trigger('lobbies', 'lobby-created', {
      lobby: updatedLobby
    })

    return NextResponse.json(updatedLobby)
  } catch (error) {
    console.error('Error creating lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const lobbies = await prisma.lobby.findMany({
      where: {
        isActive: true
      },
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(lobbies)
  } catch (error) {
    console.error('Error fetching lobbies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
