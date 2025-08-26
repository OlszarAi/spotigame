'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Login() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-black flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">SpotiGame</h1>
          <p className="text-gray-300 text-lg">
            Guess who added which track to your Blend playlist!
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={() => signIn('spotify', { callbackUrl: '/' })}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span>Continue with Spotify</span>
          </button>

          <div className="text-center text-gray-400 text-sm">
            <p>You'll need a Spotify account to play</p>
            <p className="mt-2">
              Make sure you have access to Blend playlists with your friends!
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-4">How to Play:</h2>
          <div className="text-gray-300 text-sm space-y-2">
            <p>1. Create a lobby and share the link with friends</p>
            <p>2. Add your Spotify Blend playlist URL</p>
            <p>3. Listen to track previews and guess who added each song</p>
            <p>4. Earn points for correct guesses!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
