import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { LobbySettings } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, settings }: { name: string; settings?: Partial<LobbySettings> } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Lobby name is required' }, { status: 400 })
    }

    const defaultSettings: LobbySettings = {
      rounds: 10,
      snippet_duration: 30,
      show_track_info: false
    }

    const lobbySettings = { ...defaultSettings, ...settings }

    // Create lobby
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('lobbies')
      .insert({
        creator_id: session.user.id,
        name: name.trim(),
        settings: lobbySettings
      })
      .select()
      .single()

    if (lobbyError) {
      console.error('Error creating lobby:', lobbyError)
      return NextResponse.json({ error: 'Failed to create lobby' }, { status: 500 })
    }

    // Add creator as first player
    const { error: playerError } = await supabaseAdmin
      .from('lobby_players')
      .insert({
        lobby_id: lobby.id,
        user_id: session.user.id,
        username: session.user.name || session.user.email || 'Unknown',
        avatar_url: session.user.image,
        is_ready: true
      })

    if (playerError) {
      console.error('Error adding creator to lobby:', playerError)
      // Clean up lobby if adding player fails
      await supabaseAdmin.from('lobbies').delete().eq('id', lobby.id)
      return NextResponse.json({ error: 'Failed to join lobby' }, { status: 500 })
    }

    return NextResponse.json({ lobby })
  } catch (error) {
    console.error('Error in lobby creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get lobbies where user is a player and lobby is not finished
    const { data: lobbies, error } = await supabaseAdmin
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
      .in('status', ['waiting', 'starting', 'in_progress'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lobbies:', error)
      return NextResponse.json({ error: 'Failed to fetch lobbies' }, { status: 500 })
    }

    return NextResponse.json({ lobbies })
  } catch (error) {
    console.error('Error in lobby fetch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
