import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { lobbyManager } from '@/lib/lobby-manager'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lobbyId }: { lobbyId: string } = await request.json()

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID is required' }, { status: 400 })
    }

    const lobby = lobbyManager.joinLobby(
      lobbyId,
      session.user.spotifyId,
      session.user.name || 'Unknown',
      session.user.image || undefined
    )

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found or not available' }, { status: 404 })
    }

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error joining lobby:', error)
    return NextResponse.json({ error: 'Failed to join lobby' }, { status: 500 })
  }
}
