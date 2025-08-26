import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(envCheck)
}
