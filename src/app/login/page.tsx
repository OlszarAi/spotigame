'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">
            🎵 SpotiGame
          </h1>
          <p className="text-green-400 text-xl mb-8">
            The ultimate Spotify music guessing game
          </p>
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-8 space-y-6">
            <h2 className="text-2xl font-semibold text-white">
              Ready to Play?
            </h2>
            <p className="text-gray-300 text-sm">
              Connect your Spotify account to start playing with your music taste
            </p>
            
            <div className="space-y-4">
              <div className="text-left text-sm text-gray-300 space-y-2">
                <h3 className="text-white font-medium">How it works:</h3>
                <ul className="space-y-1 ml-4">
                  <li>• Create or join a game lobby</li>
                  <li>• We&apos;ll fetch everyone&apos;s top tracks</li>
                  <li>• Guess which player each song belongs to</li>
                  <li>• Compete for the highest score!</li>
                </ul>
              </div>
              
              <button
                onClick={() => signIn('spotify', { callbackUrl: '/' })}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
              >
                <span className="text-2xl">🎧</span>
                <span>Connect with Spotify</span>
              </button>
              
              <p className="text-xs text-gray-400 text-center">
                We only access your top tracks and basic profile info
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
