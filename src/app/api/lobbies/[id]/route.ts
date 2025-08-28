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

    const lobby = await prisma.lobby.findUnique({
      where: { id },
      include: {
        players: {
          select: {
            id: true,
            userId: true,
            username: true,
            avatarUrl: true,
            joinedAt: true,
            isReady: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // Transform to match expected format
    const transformedLobby = {
      ...lobby,
      creator_id: lobby.creatorId,
      current_round: lobby.currentRound,
      max_players: lobby.maxPlayers,
      created_at: lobby.createdAt,
      updated_at: lobby.updatedAt,
      lobby_players: lobby.players.map(player => ({
        id: player.id,
        user_id: player.userId,
        username: player.username,
        avatar_url: player.avatarUrl,
        joined_at: player.joinedAt,
        is_ready: player.isReady
      }))
    }

    return NextResponse.json({ lobby: transformedLobby })
  } catch (error) {
    console.error('Error fetching lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if lobby exists and is joinable
    const lobby = await prisma.lobby.findUnique({
      where: { id },
      include: {
        players: true
      }
    })

    if (!lobby || lobby.status !== 'waiting') {
      return NextResponse.json({ error: 'Lobby not found or not joinable' }, { status: 404 })
    }

    // Check if lobby is full
    if (lobby.players.length >= lobby.maxPlayers) {
      return NextResponse.json({ error: 'Lobby is full' }, { status: 400 })
    }

    // Check if user is already in lobby
    const existingPlayer = lobby.players.find(p => p.userId === session.user.id)
    if (existingPlayer) {
      return NextResponse.json({ error: 'Already in lobby' }, { status: 400 })
    }

    // Add player to lobby
    const player = await prisma.lobbyPlayer.create({
      data: {
        lobbyId: id,
        userId: session.user.id,
        username: session.user.name || session.user.email || 'Unknown',
        avatarUrl: session.user.image
      }
    })

    return NextResponse.json({ player })
  } catch (error) {
    console.error('Error in lobby join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { settings, status } = await request.json()

    // Check if user is the lobby creator
    const lobby = await prisma.lobby.findUnique({
      where: { id },
      select: { creatorId: true }
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    if (lobby.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Only lobby creator can update settings' }, { status: 403 })
    }

    // Update lobby
    const updateData: Record<string, unknown> = {}
    if (settings) updateData.settings = settings
    if (status) updateData.status = status

    const updatedLobby = await prisma.lobby.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any // Temporary bypass for Prisma typing
    })

    return NextResponse.json({ lobby: updatedLobby })
  } catch (error) {
    console.error('Error in lobby update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Leave lobby endpoint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is in the lobby
    const player = await prisma.lobbyPlayer.findFirst({
      where: {
        lobbyId: id,
        userId: session.user.id
      }
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not in lobby' }, { status: 404 })
    }

    // Remove player from lobby
    await prisma.lobbyPlayer.delete({
      where: { id: player.id }
    })

    // Check if lobby is now empty and delete it if so
    const remainingPlayersCount = await prisma.lobbyPlayer.count({
      where: { lobbyId: id }
    })

    if (remainingPlayersCount === 0) {
      // Delete empty lobby (cascade will handle related records)
      await prisma.lobby.delete({
        where: { id }
      })
      
      return NextResponse.json({ message: 'Left lobby and lobby was deleted (empty)' })
    }

    return NextResponse.json({ message: 'Successfully left lobby' })
  } catch (error) {
    console.error('Error leaving lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
