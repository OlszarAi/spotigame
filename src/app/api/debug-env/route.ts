import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasSpotifyClientId: !!process.env.SPOTIFY_CLIENT_ID,
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID?.substring(0, 8) + '...',
    hasSpotifyClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPusherConfig: !!process.env.NEXT_PUBLIC_PUSHER_KEY
  })
}
