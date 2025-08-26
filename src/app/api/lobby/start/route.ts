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

    const lobby = lobbyManager.startGame(lobbyId, session.user.spotifyId)
    
    if (!lobby) {
      return NextResponse.json({ error: 'Cannot start game - lobby not found, not authorized, or not enough players' }, { status: 400 })
    }

    return NextResponse.json({ 
      lobby,
      redirectUrl: `/game/${lobbyId}`
    })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }
}
