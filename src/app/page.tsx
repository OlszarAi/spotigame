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
    tracksPerUser: 8
  })

  const handleCreateLobby = async () => {
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
              {/* Game Info */}
              <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-2">🎵 Single Player Demo!</h3>
                <p className="text-white opacity-90">
                  Currently in demo mode - uses only your top tracks from last 4 weeks. You'll guess which of YOUR songs is playing!
                </p>
              </div>

              {/* Tracks per User */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Tracks per Player
                </label>
                <select
                  value={gameSettings.tracksPerUser}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    tracksPerUser: parseInt(e.target.value)
                  })}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                >
                  <option value={5}>5 tracks per player</option>
                  <option value={8}>8 tracks per player</option>
                  <option value={10}>10 tracks per player</option>
                  <option value={15}>15 tracks per player</option>
                </select>
                <p className="text-gray-400 text-sm mt-1">
                  How many top tracks to include from each player's Spotify
                </p>
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
                disabled={isCreatingLobby}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
              >
                {isCreatingLobby ? 'Creating Lobby...' : 'Create Game Lobby'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">How to Play:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Create a demo lobby (single player mode)</li>
              <li>Game will collect your top tracks from last 4 weeks</li>
              <li>Listen to song previews and try to recognize your own music!</li>
              <li>Great way to discover what you've been listening to lately!</li>
            </ol>
            <div className="mt-4 bg-blue-900 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                <strong>🚧 Demo Version:</strong> Currently single-player only using your own Spotify top tracks. 
                Multi-player support coming soon where you'll guess whose tracks belong to whom!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
