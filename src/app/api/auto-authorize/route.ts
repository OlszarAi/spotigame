import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import GameStore from '@/lib/gameStore'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const gameStore = GameStore.getInstance()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lobbyId } = await request.json()

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID required' }, { status: 400 })
    }

    const lobby = gameStore.getLobby(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // Check if user is lobby owner (temporary fix)
    if (lobby.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Only lobby owner can authorize all players' }, { status: 403 })
    }

    // Get owner's access token
    let ownerToken = session.accessToken
    
    if (!ownerToken) {
      try {
        const { getToken } = await import('next-auth/jwt')
        const token = await getToken({ req: request as any })
        ownerToken = (token as any)?.accessToken
      } catch (error) {
        console.error('Failed to get token:', error)
      }
    }

    if (!ownerToken) {
      return NextResponse.json({ 
        error: 'No Spotify access token. Please sign out and sign in again.' 
      }, { status: 401 })
    }

    // Store owner's token for all players (temporary fix for testing)
    lobby.players.forEach(player => {
      gameStore.storePlayerToken(lobbyId, player.id, ownerToken)
      console.log(`✅ Authorized player ${player.name} with owner's token`)
    })

    return NextResponse.json({ 
      message: `All ${lobby.players.length} players authorized successfully`,
      authorizedPlayers: lobby.players.map(p => p.name)
    })

  } catch (error) {
    console.error('Error in auto-authorize:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lobbyId = searchParams.get('lobbyId')

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID required' }, { status: 400 })
    }

    const lobby = gameStore.getLobby(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // Check which players are authorized
    const authStatus: Record<string, boolean> = {}
    lobby.players.forEach(player => {
      const token = gameStore.getPlayerToken(lobbyId, player.id)
      authStatus[player.id] = !!token
    })

    return NextResponse.json({ authStatus })

  } catch (error) {
    console.error('Error fetching auth status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
