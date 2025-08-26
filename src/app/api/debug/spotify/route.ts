import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { SpotifyService } from '@/lib/spotify'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession() as any
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { playlistUrl } = await request.json()
    
    const debugInfo: any = {
      session: {
        user: session.user,
        hasAccessToken: !!session.accessToken,
        accessTokenLength: session.accessToken?.length,
        error: session.error
      },
      playlistUrl,
      timestamp: new Date().toISOString()
    }

    if (!session.accessToken) {
      return NextResponse.json({
        ...debugInfo,
        error: 'No access token in session'
      })
    }

    try {
      const spotifyService = new SpotifyService(session.accessToken)
      
      // Test user profile access
      const userProfile = await spotifyService.getUserProfile()
      debugInfo.userProfile = {
        id: userProfile.id,
        display_name: userProfile.display_name,
        email: userProfile.email
      }

      // Test playlist access
      const playlist = await spotifyService.getPlaylistFromUrl(playlistUrl)
      debugInfo.playlist = {
        id: playlist.id,
        name: playlist.name,
        public: playlist.public,
        collaborative: playlist.collaborative,
        owner: playlist.owner,
        tracks_total: playlist.tracks.total
      }

      // Test getting tracks
      const tracks = await spotifyService.getPlaylistTracks(playlistUrl)
      debugInfo.tracks = {
        count: tracks.length,
        samples: tracks.slice(0, 3).map(t => ({
          name: t.name,
          artist: t.artist,
          added_by: t.added_by_name,
          has_preview: !!t.preview_url
        }))
      }

      return NextResponse.json(debugInfo)
      
    } catch (spotifyError: any) {
      return NextResponse.json({
        ...debugInfo,
        spotifyError: {
          message: spotifyError.message,
          statusCode: spotifyError.statusCode,
          body: spotifyError.body
        }
      })
    }

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
