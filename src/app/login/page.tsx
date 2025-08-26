'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function LoginContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      router.push('/')
    }
    
    // Check for OAuth errors in URL
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(getErrorMessage(errorParam))
    }
  }, [session, router, searchParams])

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'OAuthCallback':
        return 'There was a problem connecting to Spotify. Please check your internet connection and try again.'
      case 'AccessDenied':
        return 'Access was denied. Please allow access to continue.'
      case 'Configuration':
        return 'Configuration error. Please contact support.'
      default:
        return 'An error occurred during authentication. Please try again.'
    }
  }

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
              {error && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 text-red-200">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
