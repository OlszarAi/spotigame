import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { fetchUserTopTracks, createTrackPool } from '@/lib/spotify'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Verify user is in the lobby and lobby is ready to start
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('lobbies')
      .select(`
        *,
        lobby_players (
          user_id,
          username,
          is_ready
        )
      `)
      .eq('id', id)
      .eq('status', 'waiting')
      .single()

    if (lobbyError || !lobby) {
      return NextResponse.json({ error: 'Lobby not found or not ready' }, { status: 404 })
    }

    // Check if user is in lobby
    const userInLobby = lobby.lobby_players.some((player: { user_id: string; username: string; is_ready: boolean }) => player.user_id === session.user.id)
    if (!userInLobby) {
      return NextResponse.json({ error: 'User not in lobby' }, { status: 403 })
    }

    // Check if all players are ready
    const allReady = lobby.lobby_players.every((player: { user_id: string; username: string; is_ready: boolean }) => player.is_ready)
    if (!allReady) {
      return NextResponse.json({ error: 'Not all players are ready' }, { status: 400 })
    }

    // Check if game session already exists
    const { data: existingSession } = await supabaseAdmin
      .from('game_sessions')
      .select('id')
      .eq('lobby_id', id)
      .single()

    if (existingSession) {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 })
    }

    // Fetch Spotify tracks for all players
    const userTracks = []
    for (const player of lobby.lobby_players) {
      try {
        // Get user's access token (this would require storing it during auth)
        // For now, we'll use the session user's token for all players
        if (player.user_id === session.user.id && session.accessToken) {
          const tracks = await fetchUserTopTracks(session.accessToken)
          userTracks.push({
            userId: player.user_id,
            username: player.username,
            tracks
          })
        }
      } catch (error) {
        console.error(`Error fetching tracks for user ${player.user_id}:`, error)
        // Continue with other players
      }
    }

    if (userTracks.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch tracks for any player' }, { status: 500 })
    }

    // Create track pool
    const trackPool = createTrackPool(userTracks)

    if (trackPool.length === 0) {
      return NextResponse.json({ error: 'No tracks with preview available' }, { status: 400 })
    }

    // Create game session
    const { data: gameSession, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .insert({
        lobby_id: id,
        track_pool: trackPool,
        status: 'preparing'
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating game session:', sessionError)
      return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 })
    }

    // Initialize player scores
    const scoreInserts = lobby.lobby_players.map((player: { user_id: string; username: string; is_ready: boolean }) => ({
      game_session_id: gameSession.id,
      user_id: player.user_id,
      total_score: 0,
      round_scores: []
    }))

    const { error: scoresError } = await supabaseAdmin
      .from('player_scores')
      .insert(scoreInserts)

    if (scoresError) {
      console.error('Error initializing player scores:', scoresError)
      // Clean up game session
      await supabaseAdmin.from('game_sessions').delete().eq('id', gameSession.id)
      return NextResponse.json({ error: 'Failed to initialize game' }, { status: 500 })
    }

    // Update lobby status
    await supabaseAdmin
      .from('lobbies')
      .update({ status: 'starting' })
      .eq('id', id)

    return NextResponse.json({ gameSession })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: gameSession, error } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        *,
        player_scores (
          user_id,
          total_score,
          round_scores
        )
      `)
      .eq('lobby_id', id)
      .single()

    if (error || !gameSession) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }

    return NextResponse.json({ gameSession })
  } catch (error) {
    console.error('Error fetching game session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
