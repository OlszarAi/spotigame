import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, maxPlayers, roundCount } = await req.json()

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

    // Trigger Pusher event
    await pusherServer.trigger('lobbies', 'lobby-created', {
      lobby
    })

    return NextResponse.json(lobby)
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
