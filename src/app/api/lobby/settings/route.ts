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

    const { lobbyId, settings }: { lobbyId: string; settings: LobbySettings } = await request.json()

    if (!lobbyId || !settings) {
      return NextResponse.json({ error: 'Lobby ID and settings are required' }, { status: 400 })
    }

    const lobby = lobbyManager.updateLobbySettings(lobbyId, session.user.spotifyId, settings)
    
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error updating lobby settings:', error)
    return NextResponse.json({ error: 'Failed to update lobby settings' }, { status: 500 })
  }
}
