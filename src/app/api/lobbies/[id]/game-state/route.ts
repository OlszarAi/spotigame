import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { selectRandomTrack } from '@/lib/spotify'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface GameState {
  status: 'waiting' | 'starting' | 'playing' | 'voting' | 'finished'
  currentRound: number
  totalRounds: number
  currentTrack: {
    id: string
    name: string
    artist: string
    preview_url: string | null
    ownerName: string
    ownerId: string
  } | null
  roundStartTime: string | null
  roundEndTime: string | null
  roundDuration: number
  playersReady: string[]
  playersGuessed: string[]
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get game session and lobby info
    const [gameSessionResult, lobbyResult] = await Promise.all([
      supabaseAdmin
        .from('game_sessions')
        .select('*')
        .eq('lobby_id', id)
        .single(),
      supabaseAdmin
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
        .single()
    ])

    if (gameSessionResult.error || !gameSessionResult.data) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }

    if (lobbyResult.error || !lobbyResult.data) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    const gameSession = gameSessionResult.data
    const lobby = lobbyResult.data
    const settings = lobby.settings as { rounds: number; snippet_duration: number }

    // Get current round guesses
    const { data: guesses } = await supabaseAdmin
      .from('round_guesses')
      .select('user_id, username')
      .eq('game_session_id', gameSession.id)
      .eq('round_number', gameSession.round_number || 1)

    const gameState: GameState = {
      status: gameSession.status,
      currentRound: gameSession.round_number || 0,
      totalRounds: settings.rounds,
      currentTrack: gameSession.current_track,
      roundStartTime: gameSession.round_start_time,
      roundEndTime: gameSession.round_end_time,
      roundDuration: settings.snippet_duration,
      playersReady: lobby.lobby_players
        .filter((p: { is_ready: boolean }) => p.is_ready)
        .map((p: { user_id: string }) => p.user_id),
      playersGuessed: guesses?.map(g => g.user_id) || []
    }

    return NextResponse.json({ gameState })
  } catch (error) {
    console.error('Error fetching game state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()
    const supabaseAdmin = getSupabaseAdmin()

    // Get current game session
    const { data: gameSession, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select('*')
      .eq('lobby_id', id)
      .single()

    if (sessionError || !gameSession) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }

    // Get lobby settings
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('lobbies')
      .select('settings, lobby_players(user_id, username)')
      .eq('id', id)
      .single()

    if (lobbyError || !lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    const settings = lobby.settings as { rounds: number; snippet_duration: number }

    switch (action) {
      case 'start_round': {
        // Only allow if game is in waiting/voting state
        if (!['waiting', 'voting', 'starting'].includes(gameSession.status)) {
          return NextResponse.json({ error: 'Cannot start round in current state' }, { status: 400 })
        }

        // Check if we've reached max rounds
        const nextRound = (gameSession.round_number || 0) + 1
        if (nextRound > settings.rounds) {
          // End game
          await supabaseAdmin
            .from('game_sessions')
            .update({ status: 'finished' })
            .eq('id', gameSession.id)

          await supabaseAdmin
            .from('lobbies')
            .update({ status: 'finished' })
            .eq('id', id)

          return NextResponse.json({ 
            gameState: { 
              status: 'finished',
              currentRound: gameSession.round_number,
              totalRounds: settings.rounds
            } 
          })
        }

        // Select random track
        const trackPool = gameSession.track_pool as Array<{
          id: string
          name: string
          artist: string
          preview_url: string | null
          ownerName: string
          ownerId: string
        }>
        
        // Convert to proper SpotifyTrack format for selectRandomTrack
        const spotifyTracks = trackPool
          .filter(track => track.preview_url)
          .map(track => ({
            id: track.id,
            name: track.name,
            artists: [{ name: track.artist }],
            preview_url: track.preview_url,
            external_urls: { spotify: `https://open.spotify.com/track/${track.id}` },
            album: {
              name: 'Unknown Album',
              images: []
            },
            ownerId: track.ownerId,
            ownerName: track.ownerName
          }))
        
        if (spotifyTracks.length === 0) {
          return NextResponse.json({ error: 'No tracks with preview available' }, { status: 400 })
        }

        const selectedTrack = selectRandomTrack(spotifyTracks)
        if (!selectedTrack) {
          return NextResponse.json({ error: 'Failed to select track' }, { status: 400 })
        }

        // Calculate timing
        const roundStartTime = new Date()
        const roundEndTime = new Date(roundStartTime.getTime() + (settings.snippet_duration * 1000))

        // Update game session
        const { error: updateError } = await supabaseAdmin
          .from('game_sessions')
          .update({
            round_number: nextRound,
            current_track: selectedTrack,
            round_start_time: roundStartTime.toISOString(),
            round_end_time: roundEndTime.toISOString(),
            status: 'playing'
          })
          .eq('id', gameSession.id)

        if (updateError) {
          console.error('Error updating game session:', updateError)
          return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })
        }

        // Update lobby status
        await supabaseAdmin
          .from('lobbies')
          .update({ 
            status: 'in_progress',
            current_round: nextRound 
          })
          .eq('id', id)

        console.log(`Round ${nextRound} started for lobby ${id} with track: ${selectedTrack.name} by ${selectedTrack.artists[0]?.name}`)

        return NextResponse.json({ 
          gameState: {
            status: 'playing',
            currentRound: nextRound,
            totalRounds: settings.rounds,
            currentTrack: selectedTrack,
            roundStartTime: roundStartTime.toISOString(),
            roundEndTime: roundEndTime.toISOString(),
            roundDuration: settings.snippet_duration,
            playersReady: [],
            playersGuessed: []
          }
        })
      }

      case 'end_round': {
        if (gameSession.status !== 'playing') {
          return NextResponse.json({ error: 'No active round to end' }, { status: 400 })
        }

        // Move to voting phase
        await supabaseAdmin
          .from('game_sessions')
          .update({ status: 'voting' })
          .eq('id', gameSession.id)

        // Auto advance to next round after 5 seconds
        setTimeout(async () => {
          try {
            // Check if still in voting phase
            const { data: currentSession } = await supabaseAdmin
              .from('game_sessions')
              .select('status, round_number')
              .eq('id', gameSession.id)
              .single()

            if (currentSession && currentSession.status === 'voting') {
              const nextRound = (currentSession.round_number || 0) + 1
              
              if (nextRound <= settings.rounds) {
                // Start next round automatically
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/lobbies/${id}/game-state`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'start_round' })
                })
              } else {
                // End game
                await supabaseAdmin
                  .from('game_sessions')
                  .update({ status: 'finished' })
                  .eq('id', gameSession.id)

                await supabaseAdmin
                  .from('lobbies')
                  .update({ status: 'finished' })
                  .eq('id', id)
              }
            }
          } catch (error) {
            console.error('Error in auto-advance:', error)
          }
        }, 5000)

        return NextResponse.json({ 
          gameState: {
            status: 'voting',
            currentRound: gameSession.round_number,
            totalRounds: settings.rounds
          }
        })
      }

      case 'check_all_guessed': {
        // Check if all players have guessed
        const { data: guesses } = await supabaseAdmin
          .from('round_guesses')
          .select('user_id')
          .eq('game_session_id', gameSession.id)
          .eq('round_number', gameSession.round_number || 1)

        const totalPlayers = lobby.lobby_players?.length || 0
        const guessedCount = guesses?.length || 0

        if (guessedCount >= totalPlayers && gameSession.status === 'playing') {
          // All players have guessed, end round
          await supabaseAdmin
            .from('game_sessions')
            .update({ status: 'voting' })
            .eq('id', gameSession.id)

          return NextResponse.json({ 
            allGuessed: true,
            gameState: { status: 'voting' }
          })
        }

        return NextResponse.json({ 
          allGuessed: false,
          guessedCount,
          totalPlayers
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error managing game state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
