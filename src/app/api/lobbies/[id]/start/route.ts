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
        // Get user's access token and refresh token from the accounts table
        const { data: account, error: accountError } = await supabaseAdmin
          .from('accounts')
          .select('access_token, refresh_token')
          .eq('userId', player.user_id)
          .eq('provider', 'spotify')
          .single()

        if (accountError || !account?.access_token) {
          console.error(`No Spotify access token found for user ${player.user_id}:`, accountError)
          continue
        }

        const tracks = await fetchUserTopTracks(account.access_token, player.user_id, account.refresh_token)
        userTracks.push({
          userId: player.user_id,
          username: player.username,
          tracks
        })
      } catch (error) {
        console.error(`Error fetching tracks for user ${player.user_id}:`, error)
        // Continue with other players
      }
    }

    if (userTracks.length === 0) {
      console.error('Failed to fetch tracks for any player. Players in lobby:', lobby.lobby_players.map((p: { user_id: string; username: string; is_ready: boolean }) => ({ id: p.user_id, username: p.username })))
      return NextResponse.json({ 
        error: 'Failed to fetch tracks for any player. Please ensure all players have connected their Spotify accounts.' 
      }, { status: 500 })
    }

    console.log(`Successfully fetched tracks for ${userTracks.length} out of ${lobby.lobby_players.length} players`)
    userTracks.forEach(user => {
      console.log(`User ${user.username}: ${user.tracks.length} tracks fetched`)
    })

    // Create track pool
    const trackPool = createTrackPool(userTracks)

    if (trackPool.length === 0) {
      return NextResponse.json({ 
        error: 'No tracks with preview available. Unfortunately, none of the players\' top tracks have audio previews. This is a common limitation of the Spotify API. Please try again later or ensure all players have recently listened to popular songs with previews available.',
        details: {
          playersProcessed: userTracks.length,
          totalPlayerTracks: userTracks.reduce((sum, user) => sum + user.tracks.length, 0)
        }
      }, { status: 400 })
    }

    if (trackPool.length < 5) {
      console.warn(`Starting game with only ${trackPool.length} tracks available. This may result in limited variety.`)
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
