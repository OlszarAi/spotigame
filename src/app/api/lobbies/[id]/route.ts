import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findLobbyByIdOrCode } from '@/lib/lobby-utils'
import { pusherServer } from '@/lib/pusher'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lobby = await findLobbyByIdOrCode(params.id, {
      host: true,
      members: {
        include: {
          user: true
        }
      }
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    return NextResponse.json(lobby)
  } catch (error) {
    console.error('Error fetching lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { maxPlayers, roundCount } = await req.json()

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find lobby and check if it exists
    const lobby = await findLobbyByIdOrCode(params.id, {
      host: true,
      members: {
        include: {
          user: true
        }
      }
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // Check if user is the host
    if (lobby.hostId !== user.id) {
      return NextResponse.json({ error: 'Only the host can update lobby settings' }, { status: 403 })
    }

    // Check if there's an active game
    const activeGame = await prisma.game.findFirst({
      where: {
        lobbyId: lobby.id,
        status: { in: ['WAITING', 'LOADING', 'PLAYING'] }
      }
    })

    if (activeGame) {
      return NextResponse.json({ error: 'Cannot update settings while game is active' }, { status: 400 })
    }

    // Validate input
    if (maxPlayers !== undefined && (maxPlayers < 2 || maxPlayers > 12)) {
      return NextResponse.json({ error: 'Max players must be between 2 and 12' }, { status: 400 })
    }

    if (roundCount !== undefined && (roundCount < 1 || roundCount > 20)) {
      return NextResponse.json({ error: 'Round count must be between 1 and 20' }, { status: 400 })
    }

    // Check if reducing maxPlayers would kick existing members
    if (maxPlayers !== undefined && maxPlayers < lobby.members.length) {
      return NextResponse.json({ 
        error: `Cannot reduce max players to ${maxPlayers} when ${lobby.members.length} players are already in the lobby` 
      }, { status: 400 })
    }

    // Build update data
    const updateData: any = {}
    if (maxPlayers !== undefined) updateData.maxPlayers = maxPlayers
    if (roundCount !== undefined) updateData.roundCount = roundCount

    // Update lobby
    const updatedLobby = await prisma.lobby.update({
      where: { id: lobby.id },
      data: updateData,
      include: {
        host: true,
        members: {
          include: {
            user: true
          }
        }
      }
    })

    // Notify all lobby members about the settings change
    await pusherServer.trigger(`lobby-${lobby.id}`, 'lobby-settings-updated', {
      lobby: updatedLobby,
      changes: updateData
    })

    return NextResponse.json(updatedLobby)
  } catch (error) {
    console.error('Error updating lobby settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
