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
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1db954] mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading...</div>
        </div>
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
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎵 SpotiGame
          </h1>
          <p className="text-[#1db954] text-lg font-medium">
            Guess whose music is playing!
          </p>
          <div className="mt-4 p-4 bg-[#181818] rounded-lg border border-[#404040]">
            <p className="text-white text-sm mb-2">
              Welcome, {session.user?.name}!
            </p>
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-12 h-12 rounded-full mx-auto"
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Create Lobby Section */}
          <div className="bg-[#181818] rounded-lg p-6 space-y-4 border border-[#404040]">
            <h2 className="text-xl font-semibold text-white mb-4">Create a New Game</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#b3b3b3] mb-2">
                  Number of Rounds
                </label>
                <select
                  value={lobbySettings.numberOfRounds}
                  onChange={(e) => setLobbySettings(prev => ({ ...prev, numberOfRounds: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#404040] rounded-md text-white focus:outline-none focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] transition-colors"
                >
                  {[5, 10, 15, 20].map(num => (
                    <option key={num} value={num} className="bg-[#121212]">{num} rounds</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#b3b3b3] mb-2">
                  Song Duration (seconds)
                </label>
                <select
                  value={lobbySettings.listeningDuration}
                  onChange={(e) => setLobbySettings(prev => ({ ...prev, listeningDuration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#404040] rounded-md text-white focus:outline-none focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] transition-colors"
                >
                  {[15, 30, 45, 60].map(num => (
                    <option key={num} value={num} className="bg-[#121212]">{num} seconds</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showTrackInfo"
                  checked={lobbySettings.showTrackInfo}
                  onChange={(e) => setLobbySettings(prev => ({ ...prev, showTrackInfo: e.target.checked }))}
                  className="mr-3 w-4 h-4 accent-[#1db954] bg-[#121212] border-[#404040] rounded focus:ring-[#1db954]"
                />
                <label htmlFor="showTrackInfo" className="text-sm text-[#b3b3b3]">
                  Show track title and artist
                </label>
              </div>
            </div>

            <button
              onClick={createLobby}
              disabled={isCreatingLobby}
              className="w-full bg-[#1db954] hover:bg-[#1ed760] disabled:bg-[#169c46] disabled:opacity-50 text-black font-bold py-3 px-4 rounded-full transition-colors"
            >
              {isCreatingLobby ? 'Creating...' : 'Create Lobby'}
            </button>
          </div>

          {/* Join Lobby Section */}
          <div className="bg-[#181818] rounded-lg p-6 space-y-4 border border-[#404040]">
            <h2 className="text-xl font-semibold text-white mb-4">Join Existing Game</h2>
            
            <div>
              <label className="block text-sm font-medium text-[#b3b3b3] mb-2">
                Lobby ID
              </label>
              <input
                type="text"
                value={joinLobbyId}
                onChange={(e) => setJoinLobbyId(e.target.value)}
                placeholder="Enter lobby ID..."
                className="w-full px-3 py-2 bg-[#121212] border border-[#404040] rounded-md text-white placeholder-[#757575] focus:outline-none focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] transition-colors"
              />
            </div>

            <button
              onClick={joinLobby}
              disabled={isJoining || !joinLobbyId.trim()}
              className="w-full bg-[#1db954] hover:bg-[#1ed760] disabled:bg-[#404040] disabled:opacity-50 text-black font-bold py-3 px-4 rounded-full transition-colors disabled:text-[#757575]"
            >
              {isJoining ? 'Joining...' : 'Join Lobby'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/api/auth/signout')}
            className="text-[#1db954] hover:text-[#1ed760] underline transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
