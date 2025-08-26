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

    const lobby = lobbyManager.leaveLobby(lobbyId, session.user.spotifyId)

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error leaving lobby:', error)
    return NextResponse.json({ error: 'Failed to leave lobby' }, { status: 500 })
  }
}
