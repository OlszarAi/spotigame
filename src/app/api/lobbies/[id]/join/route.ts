import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { findLobbyByIdOrCode } from '@/lib/lobby-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find lobby using game code or full ID
    const lobby = await findLobbyByIdOrCode(params.id, {
      members: true
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    if (!lobby.isActive) {
      return NextResponse.json({ error: 'Lobby is no longer active' }, { status: 400 })
    }

    // Check if lobby is full
    if (lobby.members.length >= lobby.maxPlayers) {
      return NextResponse.json({ error: 'Lobby is full' }, { status: 400 })
    }

    // Check if user is already in lobby
    const existingMember = await prisma.lobbyMember.findUnique({
      where: {
        userId_lobbyId: {
          userId: user.id,
          lobbyId: lobby.id
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'You are already in this lobby' }, { status: 400 })
    }

    // Add user to lobby
    const newMember = await prisma.lobbyMember.create({
      data: {
        userId: user.id,
        lobbyId: lobby.id,
        isReady: false
      },
      include: {
        user: true
      }
    })

    // Trigger Pusher event
    await pusherServer.trigger(`lobby-${lobby.id}`, 'member-joined', {
      member: newMember
    })

    return NextResponse.json({ success: true, member: newMember })
  } catch (error) {
    console.error('Error joining lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
