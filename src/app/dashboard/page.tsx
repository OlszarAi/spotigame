'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isCreatingLobby, setIsCreatingLobby] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [lobbyName, setLobbyName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [roundCount, setRoundCount] = useState(5)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
    if (session?.user?.name) {
      setLobbyName(`${session.user.name}'s Game`)
    }
  }, [status, router, session?.user?.name])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-spotify-gray">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const createLobby = async () => {
    setIsCreatingLobby(true)
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: lobbyName || `${session.user.name}'s Game`,
          maxPlayers,
          roundCount,
        }),
      })

      if (response.ok) {
        const lobby = await response.json()
        router.push(`/lobby/${lobby.id}`)
      } else {
        console.error('Failed to create lobby')
      }
    } catch (error) {
      console.error('Error creating lobby:', error)
    } finally {
      setIsCreatingLobby(false)
    }
  }

  const quickCreateLobby = async () => {
    setIsCreatingLobby(true)
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${session.user.name}'s Game`,
          maxPlayers: 8,
          roundCount: 5,
        }),
      })

      if (response.ok) {
        const lobby = await response.json()
        router.push(`/lobby/${lobby.id}`)
      } else {
        console.error('Failed to create lobby')
      }
    } catch (error) {
      console.error('Error creating lobby:', error)
    } finally {
      setIsCreatingLobby(false)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-spotify-green">SpotiGame</h1>
            <p className="text-spotify-gray">Welcome back, {session.user.name}!</p>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Create New Game</h2>
            <p className="text-spotify-gray mb-4">
              Start a new lobby and invite your friends to guess your favorite tracks!
            </p>
            
            {!showCreateForm ? (
              <div className="space-y-2">
                <button
                  onClick={quickCreateLobby}
                  disabled={isCreatingLobby}
                  className="btn-primary w-full"
                >
                  {isCreatingLobby ? 'Creating...' : 'Quick Create (8 players, 5 rounds)'}
                </button>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-secondary w-full"
                >
                  Custom Settings
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="lobbyName" className="block text-sm font-medium mb-2">
                    Lobby Name (optional)
                  </label>
                  <input
                    type="text"
                    id="lobbyName"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    placeholder={`${session.user.name}'s Game`}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-spotify-green focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="maxPlayers" className="block text-sm font-medium mb-2">
                    Max Players
                  </label>
                  <input
                    type="number"
                    id="maxPlayers"
                    min="2"
                    max="12"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-spotify-green focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="roundCount" className="block text-sm font-medium mb-2">
                    Number of Rounds
                  </label>
                  <input
                    type="number"
                    id="roundCount"
                    min="1"
                    max="50"
                    value={roundCount}
                    onChange={(e) => setRoundCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-spotify-green focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createLobby}
                    disabled={isCreatingLobby}
                    className="btn-primary flex-1"
                  >
                    {isCreatingLobby ? 'Creating...' : 'Create Lobby'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Join Game</h2>
            <p className="text-spotify-gray mb-4">
              Have a game code? Join an existing lobby and start playing!
            </p>
            <Link href="/join" className="btn-secondary w-full block text-center">
              Join Lobby
            </Link>
          </div>
        </div>

        {/* Recent Games */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
          <p className="text-spotify-gray">
            No recent games yet. Create your first lobby to get started!
          </p>
        </div>
      </div>

      {/* Footer with Author Info */}
      <footer className="mt-16 border-t border-zinc-800 pt-8 pb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-spotify-gray">Created by</span>
              <a 
                href="https://github.com/OlszarAi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-spotify-green hover:text-green-400 transition-colors font-semibold"
              >
                Adam Olszar
              </a>
            </div>
            <div className="flex items-center space-x-4 text-sm text-spotify-gray">
              <a 
                href="https://github.com/OlszarAi/spotigame" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>View on GitHub</span>
              </a>
              <span>•</span>
              <span>MIT License</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
