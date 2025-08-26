'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Lobby, LobbySettings } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function LobbyPage({ params }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lobby, setLobby] = useState<Lobby | null>(null)
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

  const fetchLobby = useCallback(async () => {
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
  }, [lobbyId])

  const joinLobbyAPI = useCallback(async () => {
    if (!lobbyId || !session?.user) return
    
    try {
      const response = await fetch('/api/lobby/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lobbyId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to join lobby')
      }
    } catch (error) {
      console.error('Error joining lobby:', error)
    }
  }, [lobbyId, session?.user])

  const leaveLobbyAPI = useCallback(async () => {
    if (!lobbyId || !session?.user) return
    
    try {
      await fetch('/api/lobby/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lobbyId }),
      })
    } catch (error) {
      console.error('Error leaving lobby:', error)
    }
  }, [lobbyId, session?.user])

  useEffect(() => {
    if (status === 'loading' || !lobbyId) return
    
    if (!session) {
      router.push('/login')
      return
    }

    // Join the lobby via API
    joinLobbyAPI()

    // Set up polling for lobby updates
    const pollInterval = setInterval(() => {
      fetchLobby()
    }, 2000) // Poll every 2 seconds

    // Fetch initial lobby data
    fetchLobby()

    return () => {
      // Leave lobby when component unmounts
      leaveLobbyAPI()
      clearInterval(pollInterval)
    }
  }, [session, status, lobbyId, router, joinLobbyAPI, leaveLobbyAPI, fetchLobby])

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

  const updateSettings = async (settings: LobbySettings) => {
    if (!isCreator || !lobbyId) return
    
    try {
      const response = await fetch('/api/lobby/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lobbyId, settings }),
      })
      
      if (response.ok) {
        // Refresh lobby data
        fetchLobby()
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  const startGame = async () => {
    if (!isCreator || !lobbyId) return
    
    try {
      const response = await fetch('/api/lobby/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lobbyId }),
      })
      
      if (response.ok) {
        const { redirectUrl } = await response.json()
        if (redirectUrl) {
          router.push(redirectUrl)
        }
      }
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  const copyLobbyLink = () => {
    if (!lobbyId) return
    
    const link = `${window.location.origin}/lobby/${lobbyId}`
    navigator.clipboard.writeText(link)
    alert('Lobby link copied to clipboard!')
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1db954] mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading lobby...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center bg-[#181818] p-8 rounded-lg border border-[#404040]">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="bg-[#1db954] hover:bg-[#1ed760] text-black font-bold py-2 px-6 rounded-full transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center bg-[#181818] p-8 rounded-lg border border-[#404040]">
          <div className="text-white text-xl mb-4">Lobby not found</div>
          <button
            onClick={() => router.push('/')}
            className="bg-[#1db954] hover:bg-[#1ed760] text-black font-bold py-2 px-6 rounded-full transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (lobby.status === 'playing') {
    router.push(`/game/${lobbyId}`)
    return null
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎵 Game Lobby
          </h1>
          <p className="text-[#1db954] text-lg font-medium">
            Lobby ID: {lobby.id}
          </p>
          <button
            onClick={copyLobbyLink}
            className="mt-2 text-[#1db954] hover:text-[#1ed760] underline text-sm transition-colors"
          >
            Copy lobby link
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <div className="bg-[#181818] rounded-lg p-6 border border-[#404040]">
            <h2 className="text-xl font-semibold text-white mb-4">Game Settings</h2>
            
            {isCreator && lobby.status === 'waiting' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#b3b3b3] mb-2">
                    Number of Rounds
                  </label>
                  <select
                    value={lobby.settings.numberOfRounds}
                    onChange={(e) => updateSettings({ ...lobby.settings, numberOfRounds: parseInt(e.target.value) })}
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
                    value={lobby.settings.listeningDuration}
                    onChange={(e) => updateSettings({ ...lobby.settings, listeningDuration: parseInt(e.target.value) })}
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
                    checked={lobby.settings.showTrackInfo}
                    onChange={(e) => updateSettings({ ...lobby.settings, showTrackInfo: e.target.checked })}
                    className="mr-3 w-4 h-4 accent-[#1db954] bg-[#121212] border-[#404040] rounded focus:ring-[#1db954]"
                  />
                  <label htmlFor="showTrackInfo" className="text-sm text-[#b3b3b3]">
                    Show track title and artist during game
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-[#b3b3b3]">
                <div className="flex justify-between">
                  <span>Rounds:</span>
                  <span className="text-white">{lobby.settings.numberOfRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span>Song Duration:</span>
                  <span className="text-white">{lobby.settings.listeningDuration} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span>Show Track Info:</span>
                  <span className="text-white">{lobby.settings.showTrackInfo ? 'Yes' : 'No'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Players Panel */}
          <div className="bg-[#181818] rounded-lg p-6 border border-[#404040]">
            <h2 className="text-xl font-semibold text-white mb-4">
              Players ({lobby.players.length})
            </h2>
            
            <div className="space-y-3">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center space-x-3 p-3 bg-[#282828] rounded-lg hover:bg-[#3e3e3e] transition-colors"
                >
                  {player.image ? (
                    <img
                      src={player.image}
                      alt={player.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#404040] flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">
                        {player.name}
                      </p>
                      {player.id === lobby.creatorId && (
                        <span className="text-xs bg-[#1db954] text-black px-2 py-1 rounded font-bold">
                          Creator
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#b3b3b3]">
                      {lobby.status === 'fetching-tracks' ? (
                        player.isReady ? (
                          <span className="text-[#1db954] flex items-center gap-1">
                            <span>✓</span> Ready
                          </span>
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
        <div className="bg-[#181818] rounded-lg p-6 text-center border border-[#404040]">
          {lobby.status === 'waiting' && (
            <>
              <p className="text-[#b3b3b3] mb-4">
                Waiting for players to join. Share the lobby ID or link with your friends!
              </p>
              {isCreator && lobby.players.length >= 2 && (
                <button
                  onClick={startGame}
                  className="bg-[#1db954] hover:bg-[#1ed760] text-black font-bold py-3 px-8 rounded-full text-lg transition-colors shadow-lg"
                >
                  Start Game
                </button>
              )}
              {lobby.players.length < 2 && (
                <p className="text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
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
                  className="bg-[#1db954] hover:bg-[#1ed760] text-black font-bold py-3 px-6 rounded-full text-lg transition-colors"
                >
                  Fetch My Tracks
                </button>
              )}
              {isFetchingTracks && (
                <div className="text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1db954] mx-auto mb-2"></div>
                  Fetching your top tracks...
                </div>
              )}
              {tracksFetched && (
                <p className="text-[#1db954] flex items-center justify-center gap-2">
                  <span>✓</span> Your tracks have been loaded!
                </p>
              )}
            </>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-[#1db954] hover:text-[#1ed760] underline transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
