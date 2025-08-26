import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import GameStore from '@/lib/gameStore'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const gameStore = GameStore.getInstance()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    
    console.log('🔍 Player-auth POST session:', {
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
      hasAccessToken: !!session?.accessToken,
      accessTokenLength: session?.accessToken?.length || 0
    })
    
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

    // Check if user is in lobby
    const isPlayerInLobby = lobby.players.some(p => p.id === session.user.email)
    if (!isPlayerInLobby) {
      return NextResponse.json({ error: 'You must be in the lobby to authorize' }, { status: 403 })
    }

    if (!session.accessToken) {
      console.error('❌ No access token in session for user:', session.user.email)
      
      // Fallback: Try to get fresh token from NextAuth
      try {
        const { getToken } = await import('next-auth/jwt')
        const token = await getToken({ req: request as any })
        
        console.log('🔍 JWT Token check:', {
          hasToken: !!token,
          hasAccessToken: !!(token as any)?.accessToken,
          tokenKeys: token ? Object.keys(token) : []
        })
        
        if ((token as any)?.accessToken) {
          console.log('✅ Found access token in JWT, using fallback')
          gameStore.storePlayerToken(lobbyId, session.user.email!, (token as any).accessToken)
          
          return NextResponse.json({ 
            message: 'Authorization successful (fallback)',
            playerId: session.user.email,
            playerName: session.user.name
          })
        }
      } catch (jwtError) {
        console.error('JWT fallback failed:', jwtError)
      }
      
      return NextResponse.json({ 
        error: 'No Spotify access token. Please sign out and sign in again.' 
      }, { status: 401 })
    }

    // Store player's access token
    gameStore.storePlayerToken(lobbyId, session.user.email!, session.accessToken)

    console.log(`✅ Stored access token for player ${session.user.name} in lobby ${lobbyId}`)

    return NextResponse.json({ 
      message: 'Authorization successful',
      playerId: session.user.email,
      playerName: session.user.name
    })

  } catch (error) {
    console.error('Error in player authorization:', error)
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

    const playersWithTokens = gameStore.getPlayersWithTokens(lobbyId)
    
    // Return status of which players have authorized
    const authStatus = lobby.players.map(player => ({
      id: player.id,
      name: player.name,
      hasAuthorized: playersWithTokens.includes(player.id)
    }))

    return NextResponse.json({ 
      authStatus,
      totalPlayers: lobby.players.length,
      authorizedPlayers: playersWithTokens.length,
      allAuthorized: authStatus.every(p => p.hasAuthorized)
    })

  } catch (error) {
    console.error('Error getting authorization status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
