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

    // Find lobby
    const lobby = await findLobbyByIdOrCode(params.id, {
      members: true
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // Remove user from lobby
    const deletedMember = await prisma.lobbyMember.deleteMany({
      where: {
        userId: user.id,
        lobbyId: lobby.id
      }
    })

    if (deletedMember.count === 0) {
      return NextResponse.json({ error: 'You are not in this lobby' }, { status: 400 })
    }

    // If the user leaving is the host and there are other members, transfer host
    if (lobby.hostId === user.id) {
      const remainingMembers = await prisma.lobbyMember.findMany({
        where: { lobbyId: lobby.id },
        include: { user: true }
      })

      if (remainingMembers.length > 0) {
        // Transfer host to the first remaining member
        await prisma.lobby.update({
          where: { id: lobby.id },
          data: { hostId: remainingMembers[0].userId }
        })
      } else {
        // No members left, deactivate lobby
        await prisma.lobby.update({
          where: { id: lobby.id },
          data: { isActive: false }
        })
      }
    }

    // Trigger Pusher event
    await pusherServer.trigger(`lobby-${lobby.id}`, 'member-left', {
      userId: user.id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error leaving lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
