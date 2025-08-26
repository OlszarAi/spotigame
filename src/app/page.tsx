'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LobbySettings } from '@/types'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isCreatingLobby, setIsCreatingLobby] = useState(false)
  const [joinLobbyId, setJoinLobbyId] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const [lobbySettings, setLobbySettings] = useState<LobbySettings>({
    numberOfRounds: 10,
    listeningDuration: 30,
    showTrackInfo: false,
  })

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  const createLobby = async () => {
    setIsCreatingLobby(true)
    try {
      const response = await fetch('/api/lobby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: lobbySettings }),
      })

      if (!response.ok) {
        throw new Error('Failed to create lobby')
      }

      const { lobby } = await response.json()
      router.push(`/lobby/${lobby.id}`)
    } catch (error) {
      console.error('Error creating lobby:', error)
      alert('Failed to create lobby. Please try again.')
    } finally {
      setIsCreatingLobby(false)
    }
  }

  const joinLobby = async () => {
    if (!joinLobbyId.trim()) return

    setIsJoining(true)
    try {
      const response = await fetch('/api/lobby/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lobbyId: joinLobbyId.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to join lobby')
      }

      router.push(`/lobby/${joinLobbyId.trim()}`)
    } catch (error) {
      console.error('Error joining lobby:', error)
      alert('Failed to join lobby. Please check the lobby ID and try again.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎵 SpotiGame
          </h1>
          <p className="text-green-400 text-lg">
            Guess whose music is playing!
          </p>
          <div className="mt-4 p-4 bg-black bg-opacity-50 rounded-lg">
            <p className="text-white text-sm">
              Welcome, {session.user?.name}!
            </p>
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-12 h-12 rounded-full mx-auto mt-2"
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Create Lobby Section */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Create a New Game</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-green-400 mb-1">
                  Number of Rounds
                </label>
                <select
                  value={lobbySettings.numberOfRounds}
                  onChange={(e) => setLobbySettings(prev => ({ ...prev, numberOfRounds: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-black bg-opacity-50 border border-green-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {[5, 10, 15, 20].map(num => (
                    <option key={num} value={num}>{num} rounds</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-green-400 mb-1">
                  Song Duration (seconds)
                </label>
                <select
                  value={lobbySettings.listeningDuration}
                  onChange={(e) => setLobbySettings(prev => ({ ...prev, listeningDuration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-black bg-opacity-50 border border-green-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {[15, 30, 45, 60].map(num => (
                    <option key={num} value={num}>{num} seconds</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showTrackInfo"
                  checked={lobbySettings.showTrackInfo}
                  onChange={(e) => setLobbySettings(prev => ({ ...prev, showTrackInfo: e.target.checked }))}
                  className="mr-2 accent-green-500"
                />
                <label htmlFor="showTrackInfo" className="text-sm text-green-400">
                  Show track title and artist
                </label>
              </div>
            </div>

            <button
              onClick={createLobby}
              disabled={isCreatingLobby}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              {isCreatingLobby ? 'Creating...' : 'Create Lobby'}
            </button>
          </div>

          {/* Join Lobby Section */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Join Existing Game</h2>
            
            <div>
              <label className="block text-sm font-medium text-green-400 mb-1">
                Lobby ID
              </label>
              <input
                type="text"
                value={joinLobbyId}
                onChange={(e) => setJoinLobbyId(e.target.value)}
                placeholder="Enter lobby ID..."
                className="w-full px-3 py-2 bg-black bg-opacity-50 border border-green-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <button
              onClick={joinLobby}
              disabled={isJoining || !joinLobbyId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              {isJoining ? 'Joining...' : 'Join Lobby'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/api/auth/signout')}
            className="text-green-400 hover:text-green-300 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
