import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { SpotifyService } from '@/lib/spotify'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug API called');
    
    const session = await getServerSession(authOptions) as any
    console.log('📝 Session exists:', !!session);
    console.log('📝 Session details:', {
      user: session?.user ? { name: session.user.name, email: session.user.email } : null,
      expires: session?.expires,
      accessToken: !!session?.accessToken,
      error: session?.error
    });

    const { action } = await request.json()
    console.log('🎵 Testing action:', action);

    if (!session?.user) {
      return NextResponse.json({
        session: null,
        action,
        timestamp: new Date().toISOString(),
        error: 'No session found - user not authenticated'
      })
    }

    const debugInfo: any = {
      session: {
        user: session.user,
        hasAccessToken: !!session.accessToken,
        accessTokenLength: session.accessToken?.length,
        error: session.error,
        expires: session.expires
      },
      action,
      timestamp: new Date().toISOString()
    }

    if (!session.accessToken) {
      console.log('❌ No access token in session');
      return NextResponse.json({
        ...debugInfo,
        error: 'No access token in session'
      })
    }

    try {
      console.log('🔑 Access token available, testing top tracks access...');
      const spotifyService = new SpotifyService(session.accessToken)
      
      // Test user profile access
      const userProfile = await spotifyService.getUserProfile()
      debugInfo.userProfile = {
        id: userProfile.id,
        display_name: userProfile.display_name,
        email: userProfile.email
      }

      // Test top tracks access
      const topTracks = await spotifyService.getTopTracks(session.user.email!, 10)
      debugInfo.topTracks = {
        count: topTracks.length,
        samples: topTracks.slice(0, 3).map(t => ({
          name: t.name,
          artist: t.artist,
          user_name: t.user_name,
          has_preview: !!t.preview_url
        }))
      }

      console.log('✅ All tests passed');
      return NextResponse.json(debugInfo)
      
    } catch (spotifyError: any) {
      console.error('❌ Spotify API error:', spotifyError);
      
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
    console.error('💥 Debug API error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
