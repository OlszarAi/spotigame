'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isCreatingLobby, setIsCreatingLobby] = useState(false)
  const [gameSettings, setGameSettings] = useState({
    numberOfRounds: 10,
    roundDuration: 30,
    playlistUrl: ''
  })

  const handleCreateLobby = async () => {
    if (!gameSettings.playlistUrl.trim()) {
      alert('Please enter a Spotify playlist URL')
      return
    }

    setIsCreatingLobby(true)

    try {
      const response = await fetch('/api/lobby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: gameSettings }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/game/${data.lobbyId}`)
      } else {
        alert(data.error || 'Failed to create lobby')
      }
    } catch (error) {
      console.error('Error creating lobby:', error)
      alert('Failed to create lobby')
    } finally {
      setIsCreatingLobby(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">SpotiGame</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-white">{session.user?.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-900 rounded-lg p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Create a New Game
            </h2>

            <div className="space-y-6">
              {/* Playlist URL */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Spotify Blend Playlist URL *
                </label>
                <input
                  type="text"
                  value={gameSettings.playlistUrl}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    playlistUrl: e.target.value
                  })}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                />
                <div className="text-gray-400 text-sm mt-1 space-y-1">
                  <p>Get the share link from your Spotify Blend playlist</p>
                  <p className="text-yellow-400">⚠️ Make sure you have access to this playlist and it's a Blend/collaborative playlist</p>
                  <p className="text-blue-400">💡 If you get "Failed to load playlist", try signing out and back in to refresh your Spotify access</p>
                </div>
              </div>

              {/* Number of Rounds */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Number of Rounds
                </label>
                <select
                  value={gameSettings.numberOfRounds}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    numberOfRounds: parseInt(e.target.value)
                  })}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                >
                  <option value={5}>5 rounds</option>
                  <option value={10}>10 rounds</option>
                  <option value={15}>15 rounds</option>
                  <option value={20}>20 rounds</option>
                </select>
              </div>

              {/* Round Duration */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Round Duration
                </label>
                <select
                  value={gameSettings.roundDuration}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    roundDuration: parseInt(e.target.value)
                  })}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>

              {/* Create Lobby Button */}
              <button
                onClick={handleCreateLobby}
                disabled={isCreatingLobby || !gameSettings.playlistUrl.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
              >
                {isCreatingLobby ? 'Creating Lobby...' : 'Create Game Lobby'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">How to Play:</h3>
            <ol className="text-gray-300 space-y-2">
              <li>1. Create a lobby with your Spotify Blend playlist</li>
              <li>2. Share the lobby link with your friends</li>
              <li>3. Wait for everyone to join</li>
              <li>4. Start the game and listen to track previews</li>
              <li>5. Guess which friend added each track to the playlist</li>
              <li>6. Earn points for correct guesses!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
