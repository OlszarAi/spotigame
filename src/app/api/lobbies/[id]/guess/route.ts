import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

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

    const { guessedUserId } = await request.json()

    if (!guessedUserId) {
      return NextResponse.json({ error: 'Guessed user ID is required' }, { status: 400 })
    }

    // Get current game session
    const { data: gameSession, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select('id, round_number, current_track, status')
      .eq('lobby_id', id)
      .single()

    if (sessionError || !gameSession) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }

    if (gameSession.status !== 'playing') {
      return NextResponse.json({ error: 'No active round' }, { status: 400 })
    }

    if (!gameSession.current_track) {
      return NextResponse.json({ error: 'No current track' }, { status: 400 })
    }

    // Check if user already submitted a guess for this round
    const { data: existingGuess } = await supabaseAdmin
      .from('round_guesses')
      .select('id')
      .eq('game_session_id', gameSession.id)
      .eq('user_id', session.user.id)
      .eq('round_number', gameSession.round_number)
      .single()

    if (existingGuess) {
      return NextResponse.json({ error: 'Guess already submitted for this round' }, { status: 400 })
    }

    // Check if guess is correct
    const currentTrack = gameSession.current_track as { ownerId?: string; [key: string]: unknown }
    const isCorrect = currentTrack.ownerId === guessedUserId
    const pointsEarned = isCorrect ? 100 : 0

    // Submit guess
    const { data: guess, error: guessError } = await supabaseAdmin
      .from('round_guesses')
      .insert({
        game_session_id: gameSession.id,
        user_id: session.user.id,
        round_number: gameSession.round_number,
        guessed_user_id: guessedUserId,
        is_correct: isCorrect,
        points_earned: pointsEarned
      })
      .select()
      .single()

    if (guessError) {
      console.error('Error submitting guess:', guessError)
      return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 })
    }

    // Update player score
    const { data: playerScore, error: scoreError } = await supabaseAdmin
      .from('player_scores')
      .select('total_score, round_scores')
      .eq('game_session_id', gameSession.id)
      .eq('user_id', session.user.id)
      .single()

    if (scoreError || !playerScore) {
      console.error('Error fetching player score:', scoreError)
      return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }

    const newTotalScore = playerScore.total_score + pointsEarned
    const newRoundScores = [
      ...(playerScore.round_scores as Array<{ round: number; points: number; correct: boolean }>),
      {
        round: gameSession.round_number,
        points: pointsEarned,
        correct: isCorrect
      }
    ]

    const { error: updateScoreError } = await supabaseAdmin
      .from('player_scores')
      .update({
        total_score: newTotalScore,
        round_scores: newRoundScores
      })
      .eq('game_session_id', gameSession.id)
      .eq('user_id', session.user.id)

    if (updateScoreError) {
      console.error('Error updating player score:', updateScoreError)
      return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }

    return NextResponse.json({ 
      guess,
      isCorrect,
      pointsEarned,
      newTotalScore 
    })
  } catch (error) {
    console.error('Error submitting guess:', error)
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

    const url = new URL(request.url)
    const roundNumber = url.searchParams.get('round')

    // Get game session
    const { data: gameSession, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select('id, round_number')
      .eq('lobby_id', id)
      .single()

    if (sessionError || !gameSession) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }

    const targetRound = roundNumber ? parseInt(roundNumber) : gameSession.round_number

    // Get guesses for the round
    const { data: guesses, error: guessesError } = await supabaseAdmin
      .from('round_guesses')
      .select('*')
      .eq('game_session_id', gameSession.id)
      .eq('round_number', targetRound)

    if (guessesError) {
      console.error('Error fetching guesses:', guessesError)
      return NextResponse.json({ error: 'Failed to fetch guesses' }, { status: 500 })
    }

    return NextResponse.json({ guesses })
  } catch (error) {
    console.error('Error fetching guesses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
