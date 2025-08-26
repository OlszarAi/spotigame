import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createSpotifyService } from '@/lib/spotify'
import { lobbyManager } from '@/lib/lobby-manager'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lobbyId }: { lobbyId: string } = await request.json()

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID is required' }, { status: 400 })
    }

    const lobby = lobbyManager.getLobby(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    const spotifyService = createSpotifyService(session.user.accessToken)
    
    try {
      const tracks = await spotifyService.getTopTracks(
        session.user.spotifyId,
        session.user.name || 'Unknown'
      )

      // Update lobby with user's tracks
      const updatedLobby = lobbyManager.setPlayerTracks(lobbyId, session.user.spotifyId, tracks)

      if (!updatedLobby) {
        return NextResponse.json({ error: 'Failed to update player tracks' }, { status: 400 })
      }

      return NextResponse.json({ 
        tracks: tracks.length,
        lobby: updatedLobby 
      })
    } catch (spotifyError) {
      console.error('Spotify API error:', spotifyError)
      return NextResponse.json({ error: 'Failed to fetch tracks from Spotify' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error fetching top tracks:', error)
    return NextResponse.json({ error: 'Failed to fetch top tracks' }, { status: 500 })
  }
}
