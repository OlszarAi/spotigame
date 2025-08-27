'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Play, Users, Trophy } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const session = await getSession()
      if (session) {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  const handleSpotifyLogin = async () => {
    setIsLoading(true)
    try {
      await signIn('spotify', { callbackUrl: '/' })
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-spotify-green p-3 rounded-full">
              <Music className="w-8 h-8 text-spotify-black" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-spotify-white mb-2">
            SpotiGame
          </h1>
          <p className="text-spotify-light-gray text-lg">
            Guess who owns the track!
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="bg-spotify-dark-gray p-3 rounded-lg mb-2">
              <Play className="w-6 h-6 text-spotify-green mx-auto" />
            </div>
            <p className="text-sm text-spotify-light-gray">Music</p>
          </div>
          <div className="text-center">
            <div className="bg-spotify-dark-gray p-3 rounded-lg mb-2">
              <Users className="w-6 h-6 text-spotify-green mx-auto" />
            </div>
            <p className="text-sm text-spotify-light-gray">Multiplayer</p>
          </div>
          <div className="text-center">
            <div className="bg-spotify-dark-gray p-3 rounded-lg mb-2">
              <Trophy className="w-6 h-6 text-spotify-green mx-auto" />
            </div>
            <p className="text-sm text-spotify-light-gray">Compete</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-spotify-dark-gray rounded-lg p-6 border border-spotify-gray">
          <h2 className="text-xl font-semibold text-spotify-white mb-4 text-center">
            Connect with Spotify
          </h2>
          <p className="text-spotify-light-gray text-sm mb-6 text-center">
            Login with your Spotify account to create lobbies and play with friends
          </p>
          
          <button
            onClick={handleSpotifyLogin}
            disabled={isLoading}
            className="w-full bg-spotify-green hover:bg-spotify-dark-green text-spotify-black font-semibold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="loading-dots">
                  <span>●</span>
                  <span>●</span>
                  <span>●</span>
                </div>
                <span className="ml-2">Connecting...</span>
              </div>
            ) : (
              'Login with Spotify'
            )}
          </button>
        </div>

        {/* How it works */}
        <div className="mt-8 text-center">
          <h3 className="text-spotify-white font-semibold mb-4">How it works</h3>
          <div className="space-y-2 text-sm text-spotify-light-gray">
            <p>1. Create or join a lobby with friends</p>
            <p>2. Listen to track snippets from everyone&apos;s top songs</p>
            <p>3. Guess which player owns each track</p>
            <p>4. Score points for correct guesses!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
