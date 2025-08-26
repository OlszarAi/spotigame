import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { lobbyManager } from '@/lib/lobby-manager'
import { LobbySettings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { settings }: { settings: LobbySettings } = await request.json()

    if (!settings || !settings.numberOfRounds || !settings.listeningDuration) {
      return NextResponse.json({ error: 'Invalid lobby settings' }, { status: 400 })
    }

    const lobby = lobbyManager.createLobby(
      session.user.spotifyId,
      session.user.name || 'Unknown',
      settings
    )

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error creating lobby:', error)
    return NextResponse.json({ error: 'Failed to create lobby' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lobbyId = searchParams.get('id')

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID is required' }, { status: 400 })
    }

    const lobby = lobbyManager.getLobby(lobbyId)

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error fetching lobby:', error)
    return NextResponse.json({ error: 'Failed to fetch lobby' }, { status: 500 })
  }
}
