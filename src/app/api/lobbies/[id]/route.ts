import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: lobby, error } = await supabaseAdmin
      .from('lobbies')
      .select(`
        *,
        lobby_players (
          id,
          user_id,
          username,
          avatar_url,
          joined_at,
          is_ready
        )
      `)
      .eq('id', id)
      .single()

    if (error || !lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error fetching lobby:', error)
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

    const supabaseAdmin = getSupabaseAdmin()

    // Check if lobby exists and is joinable
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('lobbies')
      .select('*, lobby_players(count)')
      .eq('id', id)
      .eq('status', 'waiting')
      .single()

    if (lobbyError || !lobby) {
      return NextResponse.json({ error: 'Lobby not found or not joinable' }, { status: 404 })
    }

    // Check if lobby is full
    const playerCount = lobby.lobby_players?.[0]?.count || 0
    if (playerCount >= lobby.max_players) {
      return NextResponse.json({ error: 'Lobby is full' }, { status: 400 })
    }

    // Check if user is already in lobby
    const { data: existingPlayer } = await supabaseAdmin
      .from('lobby_players')
      .select('id')
      .eq('lobby_id', id)
      .eq('user_id', session.user.id)
      .single()

    if (existingPlayer) {
      return NextResponse.json({ error: 'Already in lobby' }, { status: 400 })
    }

    // Add player to lobby
    const { data: player, error: playerError } = await supabaseAdmin
      .from('lobby_players')
      .insert({
        lobby_id: id,
        user_id: session.user.id,
        username: session.user.name || session.user.email || 'Unknown',
        avatar_url: session.user.image
      })
      .select()
      .single()

    if (playerError) {
      console.error('Error joining lobby:', playerError)
      return NextResponse.json({ error: 'Failed to join lobby' }, { status: 500 })
    }

    return NextResponse.json({ player })
  } catch (error) {
    console.error('Error in lobby join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { settings, status } = await request.json()

    // Check if user is the lobby creator
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('lobbies')
      .select('creator_id')
      .eq('id', id)
      .single()

    if (lobbyError || !lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    if (lobby.creator_id !== session.user.id) {
      return NextResponse.json({ error: 'Only lobby creator can update settings' }, { status: 403 })
    }

    // Update lobby
    const updateData: { settings?: unknown; status?: string } = {}
    if (settings) updateData.settings = settings
    if (status) updateData.status = status

    const { data: updatedLobby, error: updateError } = await supabaseAdmin
      .from('lobbies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating lobby:', updateError)
      return NextResponse.json({ error: 'Failed to update lobby' }, { status: 500 })
    }

    return NextResponse.json({ lobby: updatedLobby })
  } catch (error) {
    console.error('Error in lobby update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
