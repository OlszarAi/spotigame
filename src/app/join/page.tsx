'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function JoinLobby() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [gameCode, setGameCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  if (status === 'unauthenticated') {
    router.push('/')
    return null
  }

  const joinLobby = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameCode.trim()) return

    setIsJoining(true)
    setError('')

    try {
      const response = await fetch(`/api/lobbies/${gameCode.toLowerCase()}/join`, {
        method: 'POST',
      })

      if (response.ok) {
        router.push(`/lobby/${gameCode.toLowerCase()}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to join lobby')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-spotify-green mb-2">Join Game</h1>
            <p className="text-spotify-gray">Enter the game code to join a lobby</p>
          </div>

          <div className="card">
            <form onSubmit={joinLobby} className="space-y-6">
              <div>
                <label htmlFor="gameCode" className="block text-sm font-medium mb-2">
                  Game Code
                </label>
                <input
                  type="text"
                  id="gameCode"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-spotify-green focus:outline-none font-mono text-lg text-center"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900 border border-red-600 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining || !gameCode.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Joining...' : 'Join Lobby'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-700 text-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-spotify-gray hover:text-white transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Author Info */}
      <footer className="border-t border-zinc-800 pt-4 pb-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-spotify-gray text-xs">Created by</span>
              <a 
                href="https://github.com/OlszarAi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-spotify-green hover:text-green-400 transition-colors font-semibold text-xs"
              >
                Adam Olszar
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
