'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Lobby, LobbySettings } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function LobbyPage({ params }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingTracks, setIsFetchingTracks] = useState(false)
  const [tracksFetched, setTracksFetched] = useState(false)
  const [error, setError] = useState('')
  const [lobbyId, setLobbyId] = useState<string | null>(null)

  const isCreator = lobby && session?.user && lobby.creatorId === session.user.spotifyId
  const currentPlayer = lobby && session?.user ? lobby.players.find(p => p.id === session.user.spotifyId) : null

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setLobbyId(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    if (status === 'loading' || !lobbyId) return
    
    if (!session) {
      router.push('/login')
      return
    }

    // Initialize socket connection
    const newSocket = io()
    setSocket(newSocket)

    // Join the lobby
    newSocket.emit('join-lobby', {
      lobbyId: lobbyId,
      userId: session.user.spotifyId
    })

    // Listen for lobby updates
    newSocket.on('lobby-updated', (updatedLobby: Lobby) => {
      setLobby(updatedLobby)
      setIsLoading(false)
    })

    newSocket.on('game-started', () => {
      // Fetch user's top tracks when game starts
      fetchTopTracks()
    })

    newSocket.on('error', (error: { message: string }) => {
      setError(error.message)
      setIsLoading(false)
    })

    // Fetch initial lobby data
    fetchLobby()

    return () => {
      newSocket.emit('leave-lobby', {
        lobbyId: lobbyId,
        userId: session?.user?.spotifyId
      })
      newSocket.disconnect()
    }
  }, [session, status, lobbyId, router])

  const fetchLobby = async () => {
    if (!lobbyId) return
    
    try {
      const response = await fetch(`/api/lobby?id=${lobbyId}`)
      if (!response.ok) {
        throw new Error('Lobby not found')
      }
      const { lobby } = await response.json()
      setLobby(lobby)
      setIsLoading(false)
    } catch (error) {
      setError('Failed to load lobby')
      setIsLoading(false)
    }
  }

  const fetchTopTracks = async () => {
    if (!lobbyId) return
    
    setIsFetchingTracks(true)
    try {
      const response = await fetch('/api/spotify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lobbyId: lobbyId }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tracks')
      }

      setTracksFetched(true)
    } catch (error) {
      setError('Failed to fetch your Spotify tracks')
    } finally {
      setIsFetchingTracks(false)
    }
  }

  const updateSettings = (settings: LobbySettings) => {
    if (!socket || !isCreator || !lobbyId) return
    
    socket.emit('update-lobby-settings', {
      lobbyId: lobbyId,
      settings
    })
  }

  const startGame = () => {
    if (!socket || !isCreator || !lobbyId) return
    
    socket.emit('start-game', {
      lobbyId: lobbyId
    })
  }

  const copyLobbyLink = () => {
    if (!lobbyId) return
    
    const link = `${window.location.origin}/lobby/${lobbyId}`
    navigator.clipboard.writeText(link)
    alert('Lobby link copied to clipboard!')
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading lobby...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Lobby not found</div>
      </div>
    )
  }

  if (lobby.status === 'playing') {
    router.push(`/game/${lobbyId}`)
    return null
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎵 Game Lobby
          </h1>
          <p className="text-green-400 text-lg">
            Lobby ID: {lobby.id}
          </p>
          <button
            onClick={copyLobbyLink}
            className="mt-2 text-blue-400 hover:text-blue-300 underline text-sm"
          >
            Copy lobby link
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Game Settings</h2>
            
            {isCreator && lobby.status === 'waiting' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-1">
                    Number of Rounds
                  </label>
                  <select
                    value={lobby.settings.numberOfRounds}
                    onChange={(e) => updateSettings({ ...lobby.settings, numberOfRounds: parseInt(e.target.value) })}
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
                    value={lobby.settings.listeningDuration}
                    onChange={(e) => updateSettings({ ...lobby.settings, listeningDuration: parseInt(e.target.value) })}
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
                    checked={lobby.settings.showTrackInfo}
                    onChange={(e) => updateSettings({ ...lobby.settings, showTrackInfo: e.target.checked })}
                    className="mr-2 accent-green-500"
                  />
                  <label htmlFor="showTrackInfo" className="text-sm text-green-400">
                    Show track title and artist during game
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-gray-300">
                <p>Rounds: {lobby.settings.numberOfRounds}</p>
                <p>Song Duration: {lobby.settings.listeningDuration} seconds</p>
                <p>Show Track Info: {lobby.settings.showTrackInfo ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>

          {/* Players Panel */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Players ({lobby.players.length})
            </h2>
            
            <div className="space-y-3">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center space-x-3 p-3 bg-black bg-opacity-30 rounded-lg"
                >
                  {player.image && (
                    <img
                      src={player.image}
                      alt={player.name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {player.name}
                      {player.id === lobby.creatorId && (
                        <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">
                          Creator
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">
                      {lobby.status === 'fetching-tracks' ? (
                        player.isReady ? (
                          <span className="text-green-400">✓ Ready</span>
                        ) : (
                          <span className="text-yellow-400">Fetching tracks...</span>
                        )
                      ) : (
                        'Waiting to start'
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Status */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 text-center">
          {lobby.status === 'waiting' && (
            <>
              <p className="text-gray-300 mb-4">
                Waiting for players to join. Share the lobby ID or link with your friends!
              </p>
              {isCreator && lobby.players.length >= 2 && (
                <button
                  onClick={startGame}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-200"
                >
                  Start Game
                </button>
              )}
              {lobby.players.length < 2 && (
                <p className="text-yellow-400">
                  You need at least 2 players to start the game
                </p>
              )}
            </>
          )}
          
          {lobby.status === 'fetching-tracks' && (
            <>
              <p className="text-yellow-400 mb-4">
                Fetching everyone&apos;s top tracks from Spotify...
              </p>
              {currentPlayer && !currentPlayer.isReady && !isFetchingTracks && !tracksFetched && (
                <button
                  onClick={fetchTopTracks}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-200"
                >
                  Fetch My Tracks
                </button>
              )}
              {isFetchingTracks && (
                <div className="text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
                  Fetching your top tracks...
                </div>
              )}
              {tracksFetched && (
                <p className="text-green-400">✓ Your tracks have been loaded!</p>
              )}
            </>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-green-400 hover:text-green-300 underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
