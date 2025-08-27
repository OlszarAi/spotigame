import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Find lobbies that are empty and older than 30 seconds
    const { data: emptyLobbies } = await supabaseAdmin
      .from('lobbies')
      .select(`
        id,
        created_at,
        lobby_players(count)
      `)
      .eq('status', 'waiting')
      .lt('created_at', new Date(Date.now() - 30 * 1000).toISOString())

    const lobbiesToDelete = emptyLobbies?.filter(lobby => 
      !lobby.lobby_players || lobby.lobby_players.length === 0 || 
      (lobby.lobby_players[0] && lobby.lobby_players[0].count === 0)
    ) || []

    if (lobbiesToDelete.length > 0) {
      const lobbyIds = lobbiesToDelete.map(l => l.id)
      
      const { error } = await supabaseAdmin
        .from('lobbies')
        .delete()
        .in('id', lobbyIds)

      if (error) {
        console.error('Error cleaning up lobbies:', error)
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
      }

      console.log(`Cleaned up ${lobbiesToDelete.length} empty lobbies`)
    }

    return NextResponse.json({ 
      message: 'Cleanup completed',
      deletedCount: lobbiesToDelete.length
    })
  } catch (error) {
    console.error('Error in lobby cleanup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
