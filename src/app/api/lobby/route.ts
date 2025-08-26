import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { v4 as uuidv4 } from 'uuid'
import { Lobby, GameSettings, User } from '@/types/game'
import GameStore from '@/lib/gameStore'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const gameStore = GameStore.getInstance()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { settings }: { settings: GameSettings } = await request.json()

    // Validate settings
    if (!settings.numberOfRounds || !settings.roundDuration || !settings.tracksPerUser) {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
    }

    const lobbyId = uuidv4()
    const owner: User = {
      id: session.user.email || '',
      name: session.user.name || '',
      email: session.user.email || '',
      image: session.user.image || undefined,
      spotifyId: '', // Will be populated from Spotify API
    }

    const lobby: Lobby = {
      id: lobbyId,
      ownerId: owner.id,
      ownerName: owner.name,
      settings,
      players: [owner],
      status: 'waiting',
      currentRound: 0,
      tracks: [],
      createdAt: new Date(),
    }

    gameStore.createLobby(lobby)

    return NextResponse.json({ 
      lobbyId,
      shareableLink: `${process.env.NEXTAUTH_URL}/game/${lobbyId}` 
    })
  } catch (error) {
    console.error('Error creating lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lobbyId = searchParams.get('id')

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID required' }, { status: 400 })
    }

    const lobby = gameStore.getLobby(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error fetching lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lobbyId, action } = await request.json()

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID required' }, { status: 400 })
    }

    const lobby = gameStore.getLobby(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    if (action === 'join') {
      const newPlayer: User = {
        id: session.user.email || '',
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image || undefined,
        spotifyId: '',
      }

      // Check if player already in lobby
      const existingPlayer = lobby.players.find(p => p.id === newPlayer.id)
      if (!existingPlayer) {
        const updatedPlayers = [...lobby.players, newPlayer]
        gameStore.updateLobby(lobbyId, { players: updatedPlayers })
      }
    }

    const updatedLobby = gameStore.getLobby(lobbyId)
    return NextResponse.json({ lobby: updatedLobby })
  } catch (error) {
    console.error('Error updating lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
