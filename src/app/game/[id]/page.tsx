'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface Track {
  id: string
  name: string
  artists: Array<{ name: string }>
  preview_url: string | null
  ownerId: string
  ownerName: string
  album: {
    name: string
    images: Array<{ url: string }>
  }
}

interface GameSession {
  id: string
  lobby_id: string
  track_pool: Track[]
  current_round: number
  current_track: Track | null
  status: string
  player_scores: Array<{
    user_id: string
    total_score: number
    round_scores: number[]
  }>
}

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const lobbyId = params.id as string

  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [players, setPlayers] = useState<{ user_id: string; username: string }[]>([])
  const [canGuess, setCanGuess] = useState(true)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [roundActive, setRoundActive] = useState(false)
  const [scores, setScores] = useState<{ user_id: string; username: string; total_score: number }[]>([])
  const [guesses, setGuesses] = useState<{ user_id: string; username: string; guess_time: string }[]>([])

  const fetchGameSession = useCallback(async () => {
    try {
      const [gameResponse, lobbyResponse] = await Promise.all([
        fetch(`/api/lobbies/${lobbyId}/start`),
        fetch(`/api/lobbies/${lobbyId}`)
      ])

      if (gameResponse.ok) {
        const gameData = await gameResponse.json()
        setGameSession(gameData.gameSession)
        
        // Get a random track from the pool
        if (gameData.gameSession.track_pool && gameData.gameSession.track_pool.length > 0) {
          const tracksWithPreviews = gameData.gameSession.track_pool.filter((track: Track) => track.preview_url)
          console.log(`Available tracks with previews: ${tracksWithPreviews.length}`)
          
          if (tracksWithPreviews.length > 0) {
            const randomTrack = tracksWithPreviews[Math.floor(Math.random() * tracksWithPreviews.length)]
            setCurrentTrack(randomTrack)
            console.log('Selected track:', randomTrack)
          } else {
            console.error('No tracks with preview URLs available')
          }
        }
      } else if (gameResponse.status === 404) {
        router.push(`/lobby/${lobbyId}`)
        return
      }

      if (lobbyResponse.ok) {
        const lobbyData = await lobbyResponse.json()
        if (lobbyData.lobby.lobby_players) {
          setPlayers(lobbyData.lobby.lobby_players.map((p: { user_id: string; username: string }) => ({
            user_id: p.user_id,
            username: p.username
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching game session:', error)
    } finally {
      setIsLoading(false)
    }
  }, [lobbyId, router])

  const fetchGameData = useCallback(async () => {
    if (!gameSession?.id) return
    
    try {
      // Fetch current scores and guesses
      const [scoresResponse, guessesResponse] = await Promise.all([
        fetch(`/api/lobbies/${lobbyId}/scores`),
        fetch(`/api/lobbies/${lobbyId}/guess?round=${gameSession.current_round}`)
      ])

      if (scoresResponse.ok) {
        const scoresData = await scoresResponse.json()
        setScores(scoresData.scores || [])
      }

      if (guessesResponse.ok) {
        const guessesData = await guessesResponse.json()
        setGuesses(guessesData.guesses || [])
      }
    } catch (error) {
      console.error('Error fetching game data:', error)
    }
  }, [gameSession?.id, gameSession?.current_round, lobbyId])

  useEffect(() => {
    fetchGameSession()
  }, [fetchGameSession])

  // Fetch game data when session is ready
  useEffect(() => {
    if (gameSession?.id) {
      fetchGameData()
    }
  }, [gameSession?.id, fetchGameData])

  // Realtime subscription for game updates
  useEffect(() => {
    if (!gameSession?.id) return

    const refreshData = () => {
      if (gameSession?.id) {
        fetchGameData()
      }
    }

    const channel = supabase
      .channel(`game-${gameSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_guesses',
          filter: `game_session_id=eq.${gameSession.id}`
        },
        () => {
          console.log('New guess submitted')
          refreshData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_scores',
          filter: `game_session_id=eq.${gameSession.id}`
        },
        () => {
          console.log('Score updated')
          refreshData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSession?.id])

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (roundActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up! Auto-submit or move to next round
            setRoundActive(false)
            setCanGuess(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [roundActive, timeLeft])

  useEffect(() => {
    if (currentTrack?.preview_url) {
      const audio = new Audio(currentTrack.preview_url)
      audio.preload = 'auto'
      audio.volume = 0.7
      
      // Add event listeners
      audio.addEventListener('play', () => setIsPlaying(true))
      audio.addEventListener('pause', () => setIsPlaying(false))
      audio.addEventListener('ended', () => setIsPlaying(false))
      audio.addEventListener('canplay', () => {
        console.log('Audio ready to play')
      })
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e)
        setIsPlaying(false)
      })
      
      setAudioElement(audio)
      
      return () => {
        audio.removeEventListener('play', () => setIsPlaying(true))
        audio.removeEventListener('pause', () => setIsPlaying(false))
        audio.removeEventListener('ended', () => setIsPlaying(false))
        audio.pause()
        audio.src = ''
      }
    }
  }, [currentTrack])

  const playPause = () => {
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause()
      } else {
        audioElement.play().catch(console.error)
      }
      setIsPlaying(!isPlaying)
    }
  }

  const submitGuess = async () => {
    if (!selectedPlayer || !canGuess) return
    
    setCanGuess(false)
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guessedUserId: selectedPlayer })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Guess result:', result)
        // Handle result (correct/incorrect, score, etc.)
        setSelectedPlayer('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit guess')
        setCanGuess(true)
      }
    } catch (error) {
      console.error('Error submitting guess:', error)
      setCanGuess(true)
    }
  }

  const startRound = () => {
    setTimeLeft(30) // Reset timer to 30 seconds
    setRoundActive(true)
    setCanGuess(true)
    setSelectedPlayer('')
    
    // Auto-play the audio
    if (audioElement) {
      audioElement.play().catch(console.error)
    }
  }

  const goBackToLobby = () => {
    router.push(`/lobby/${lobbyId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">Game not found</h1>
          <button 
            onClick={goBackToLobby}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black text-spotify-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={goBackToLobby}
            className="flex items-center gap-2 text-spotify-light-gray hover:text-spotify-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Lobby
          </button>
          <h1 className="text-3xl font-bold text-spotify-green">SpotiGame</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {currentTrack ? (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Game Panel */}
            <div className="lg:col-span-2">
              <div className="bg-spotify-dark-gray rounded-2xl p-8 mb-8 border border-spotify-gray">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2 text-spotify-white">Guess the Song!</h2>
                <p className="text-spotify-light-gray">Listen to the preview and guess whose song this is</p>
                
                {/* Timer Display */}
                <div className="mt-4">
                  <div className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-spotify-green'}`}>
                    {timeLeft}s
                  </div>
                  <div className="w-full bg-spotify-gray rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-spotify-green'}`}
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Album Art */}
              {currentTrack.album?.images?.[0] && (
                <div className="flex justify-center mb-6">
                  <Image 
                    src={currentTrack.album.images[0].url} 
                    alt="Album art"
                    width={192}
                    height={192}
                    className="rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* Audio Controls */}
              <div className="flex justify-center items-center gap-4 mb-8">
                <button
                  onClick={playPause}
                  className="bg-spotify-green hover:bg-spotify-dark-green p-4 rounded-full transition-colors shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-spotify-black" />
                  ) : (
                    <Play className="w-8 h-8 text-spotify-black" />
                  )}
                </button>
                <div className="text-center">
                  <p className="text-sm text-spotify-light-gray">
                    {audioElement ? (isPlaying ? 'Playing...' : 'Ready to play') : 'Loading...'}
                  </p>
                </div>
              </div>

              {/* Game Controls */}
              {!roundActive ? (
                <div className="text-center">
                  <button
                    onClick={startRound}
                    className="bg-spotify-green hover:bg-spotify-dark-green p-4 rounded-lg font-semibold text-spotify-black transition-colors text-lg px-8"
                  >
                    Start Round
                  </button>
                </div>
              ) : (
                <>
                  {/* Player Selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center text-spotify-white">Whose song is this?</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {players.map((player) => (
                        <button
                          key={player.user_id}
                          onClick={() => setSelectedPlayer(player.user_id)}
                          disabled={!canGuess}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            selectedPlayer === player.user_id
                              ? 'border-spotify-green bg-spotify-green/20 text-spotify-green'
                              : 'border-spotify-gray bg-spotify-dark-gray text-spotify-white hover:border-spotify-light-gray hover:bg-spotify-gray/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="font-medium">{player.username}</div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={submitGuess}
                      disabled={!selectedPlayer || !canGuess}
                      className="w-full bg-spotify-green hover:bg-spotify-dark-green disabled:bg-gray-600 disabled:cursor-not-allowed p-4 rounded-lg font-semibold transition-colors text-spotify-black disabled:text-white"
                    >
                      {canGuess ? 'Submit Guess' : 'Guess Submitted'}
                    </button>
                  </div>
                </>
              )}
              </div>
              
              {/* Debug Info */}
              <div className="bg-spotify-dark-gray border border-spotify-gray rounded-lg p-4 text-sm">
                <p className="mb-2 text-spotify-white"><strong>Track Info:</strong></p>
                <p className="text-spotify-light-gray">Song Owner: {currentTrack.ownerName}</p>
                <p className="text-spotify-light-gray">Preview URL: {currentTrack.preview_url ? '✅ Available' : '❌ Missing'}</p>
                <p className="text-spotify-light-gray">Track Pool Size: {gameSession.track_pool.length}</p>
                <p className="text-spotify-light-gray">Tracks with Previews: {gameSession.track_pool.filter(t => t.preview_url).length}</p>
              </div>
            </div>

            {/* Live Leaderboard & Activity */}
            <div className="space-y-6">
              {/* Leaderboard */}
              <div className="bg-spotify-dark-gray rounded-2xl p-6 border border-spotify-gray">
                <h3 className="text-xl font-bold text-spotify-white mb-4">🏆 Leaderboard</h3>
                <div className="space-y-3">
                  {scores.length > 0 ? scores.map((score, index) => (
                    <div key={score.user_id} className="flex items-center justify-between p-3 bg-spotify-black rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' : 
                          index === 1 ? 'bg-gray-400 text-black' : 
                          index === 2 ? 'bg-orange-600 text-white' : 
                          'bg-spotify-gray text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-spotify-white font-medium">{score.username}</span>
                      </div>
                      <span className="text-spotify-green font-bold">{score.total_score}</span>
                    </div>
                  )) : (
                    <p className="text-spotify-light-gray text-center">No scores yet</p>
                  )}
                </div>
              </div>

              {/* Live Activity */}
              <div className="bg-spotify-dark-gray rounded-2xl p-6 border border-spotify-gray">
                <h3 className="text-xl font-bold text-spotify-white mb-4">📊 Round Activity</h3>
                <div className="space-y-2">
                  {guesses.length > 0 ? guesses.map((guess, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-spotify-black rounded text-sm">
                      <span className="text-spotify-white">{guess.username}</span>
                      <span className="text-spotify-light-gray">✅ Submitted</span>
                    </div>
                  )) : (
                    <p className="text-spotify-light-gray text-center text-sm">Waiting for guesses...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl mb-4">No tracks available with preview URLs</h2>
            <p className="text-white/70 mb-6">
              Unfortunately, we couldn&apos;t find any tracks with audio previews to play.
            </p>
            <button 
              onClick={goBackToLobby}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg"
            >
              Back to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
