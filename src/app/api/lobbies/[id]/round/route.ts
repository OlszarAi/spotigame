import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { selectRandomTrack } from '@/lib/spotify'
import { GameTrack } from '@/types/database'

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

    const { action } = await request.json()

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
      .select('settings')
      .eq('id', id)
      .single()

    if (lobbyError || !lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    const settings = lobby.settings as { rounds: number; snippet_duration: number; [key: string]: unknown }

    if (action === 'next_round') {
      // Check if game is finished
      if (gameSession.round_number >= settings.rounds) {
        // Finish game
        await supabaseAdmin
          .from('game_sessions')
          .update({ status: 'finished' })
          .eq('id', gameSession.id)

        await supabaseAdmin
          .from('lobbies')
          .update({ status: 'finished' })
          .eq('id', id)

        return NextResponse.json({ finished: true })
      }

      // Select random track for next round
      const trackPool = gameSession.track_pool as GameTrack[]
      const selectedTrack = selectRandomTrack(trackPool)

      if (!selectedTrack) {
        return NextResponse.json({ error: 'No tracks available' }, { status: 400 })
      }

      // Update game session with new round
      const nextRound = gameSession.round_number + 1
      const roundStartTime = new Date().toISOString()
      const roundEndTime = new Date(Date.now() + settings.snippet_duration * 1000).toISOString()

      const { error: updateError } = await supabaseAdmin
        .from('game_sessions')
        .update({
          round_number: nextRound,
          current_track: selectedTrack,
          round_start_time: roundStartTime,
          round_end_time: roundEndTime,
          status: 'playing'
        })
        .eq('id', gameSession.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating game session:', updateError)
        return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })
      }

      // Update lobby status and current round
      await supabaseAdmin
        .from('lobbies')
        .update({ 
          status: 'in_progress',
          current_round: nextRound 
        })
        .eq('id', id)

      return NextResponse.json({ 
        round: nextRound,
        track: selectedTrack,
        startTime: roundStartTime,
        endTime: roundEndTime
      })
    }

    if (action === 'end_round') {
      // Move to voting/results phase
      await supabaseAdmin
        .from('game_sessions')
        .update({ status: 'voting' })
        .eq('id', gameSession.id)

      return NextResponse.json({ status: 'voting' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing round:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: gameSession, error } = await supabaseAdmin
      .from('game_sessions')
      .select('current_track, round_number, round_start_time, round_end_time, status')
      .eq('lobby_id', id)
      .single()

    if (error || !gameSession) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      currentTrack: gameSession.current_track,
      roundNumber: gameSession.round_number,
      roundStartTime: gameSession.round_start_time,
      roundEndTime: gameSession.round_end_time,
      status: gameSession.status
    })
  } catch (error) {
    console.error('Error fetching round info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
