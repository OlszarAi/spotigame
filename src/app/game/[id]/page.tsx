'use client'

import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useSession } from 'next-auth/react'
import { Session } from 'next-auth'
import SpotifyEmbedPlayer from '@/components/spotify-embed-player'

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

interface GameState {
  status: 'waiting' | 'starting' | 'playing' | 'voting' | 'finished'
  currentRound: number
  totalRounds: number
  currentTrack: Track | null
  roundStartTime: string | null
  roundEndTime: string | null
  roundDuration: number
  playersReady: string[]
  playersGuessed: string[]
}

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const lobbyId = params.id as string
  const { data: session } = useSession() as { data: Session | null }
  
  // Debug mode - skip audio requirement
  const debugNoAudio = searchParams.get('debug') === 'no-audio'

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [players, setPlayers] = useState<{ user_id: string; username: string }[]>([])
  const [canGuess, setCanGuess] = useState(true)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [scores, setScores] = useState<{ user_id: string; username: string; total_score: number }[]>([])
  const [guesses, setGuesses] = useState<{ user_id: string; username: string; guess_time: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/game-state`)
      
      if (response.ok) {
        const data = await response.json()
        setGameState(data.gameState)
        setError(null)
        
        // If game is finished, redirect to lobby
        if (data.gameState.status === 'finished') {
          setTimeout(() => {
            router.push(`/lobby/${lobbyId}`)
          }, 3000)
        }
      } else if (response.status === 404) {
        // Game doesn't exist yet, redirect to lobby
        router.push(`/lobby/${lobbyId}`)
        return
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch game state')
      }
    } catch (error) {
      console.error('Error fetching game state:', error)
      setError('Network error')
    }
  }, [lobbyId, router])

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}`)
      if (response.ok) {
        const lobbyData = await response.json()
        if (lobbyData.lobby.lobby_players) {
          setPlayers(lobbyData.lobby.lobby_players.map((p: { user_id: string; username: string }) => ({
            user_id: p.user_id,
            username: p.username
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }, [lobbyId])

  const fetchGameData = useCallback(async () => {
    if (!gameState?.currentRound) return
    
    try {
      // Fetch current scores and guesses
      const [scoresResponse, guessesResponse] = await Promise.all([
        fetch(`/api/lobbies/${lobbyId}/scores`),
        fetch(`/api/lobbies/${lobbyId}/guess?round=${gameState.currentRound}`)
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
  }, [gameState?.currentRound, lobbyId])

  // Timer effect based on game state
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !gameState.roundEndTime) {
      setTimeLeft(0)
      return
    }

    const updateTimer = () => {
      const now = new Date().getTime()
      const endTime = new Date(gameState.roundEndTime!).getTime()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      
      setTimeLeft(remaining)
      
      // Auto-end round when time runs out - now handled by backend
      // if (remaining <= 0 && gameState.status === 'playing') {
      //   endRound()
      // }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [gameState?.roundEndTime, gameState?.status, gameState])

  // Reset guess state when new round starts
  useEffect(() => {
    if (gameState?.status === 'playing') {
      setCanGuess(true)
      setSelectedPlayer('')
    }
  }, [gameState?.currentRound, gameState?.status])

  // Realtime subscription for game state changes
  useEffect(() => {
    const channel = supabase
      .channel(`game-lobby-${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          console.log('Game session updated')
          fetchGameState()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_guesses'
        },
        () => {
          console.log('New guess submitted')
          fetchGameData()
          checkAllGuessed()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_scores'
        },
        () => {
          console.log('Score updated')
          fetchGameData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lobbyId, fetchGameState, fetchGameData])

  // Initial data fetch
  useEffect(() => {
    fetchGameState()
    fetchPlayers()
  }, [fetchGameState, fetchPlayers])

  // Fetch game data when game state changes
  useEffect(() => {
    if (gameState?.currentRound) {
      fetchGameData()
    }
  }, [gameState?.currentRound, fetchGameData])

  const startRound = async () => {
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/game-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_round' })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGameState(data.gameState)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to start round')
      }
    } catch (error) {
      console.error('Error starting round:', error)
      setError('Failed to start round')
    }
  }

  const endRound = async () => {
    try {
      await fetch(`/api/lobbies/${lobbyId}/game-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_round' })
      })
    } catch (error) {
      console.error('Error ending round:', error)
    }
  }

  const checkAllGuessed = async () => {
    try {
      await fetch(`/api/lobbies/${lobbyId}/game-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_all_guessed' })
      })
    } catch (error) {
      console.error('Error checking guesses:', error)
    }
  }

  const submitGuess = async () => {
    if (!selectedPlayer || !canGuess || !session?.user?.id) return
    
    // Prevent guessing on yourself
    if (selectedPlayer === session.user.id) {
      setError('You cannot guess yourself!')
      return
    }
    
    setCanGuess(false)
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guessedUserId: selectedPlayer })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Guess result:', result)
        setSelectedPlayer('')
        setError(null)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to submit guess')
        setCanGuess(true)
      }
    } catch (error) {
      console.error('Error submitting guess:', error)
      setError('Failed to submit guess')
      setCanGuess(true)
    }
  }

  const goBackToLobby = () => {
    router.push(`/lobby/${lobbyId}`)
  }

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (!gameState) {
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
  // Game status display
  const getStatusDisplay = () => {
    if (!gameState) return 'Loading...'
    
    switch (gameState.status) {
      case 'waiting':
        return 'Waiting to start...'
      case 'starting':
        return 'Game starting...'
      case 'playing':
        return `Round ${gameState.currentRound}/${gameState.totalRounds}`
      case 'voting':
        return 'Round ended - Results'
      case 'finished':
        return 'Game finished!'
      default:
        return gameState.status
    }
  }

  const hasUserGuessed = session?.user?.id && gameState?.playersGuessed.includes(session.user.id)

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
          <h1 className="text-3xl font-bold text-spotify-green">
            SpotiGame
            {debugNoAudio && (
              <span className="ml-2 text-sm font-normal text-yellow-400 bg-yellow-600/20 px-2 py-1 rounded">
                DEBUG: NO-AUDIO
              </span>
            )}
          </h1>
          <div className="text-right">
            <div className="text-lg font-semibold">{getStatusDisplay()}</div>
            {gameState?.status === 'playing' && timeLeft > 0 && (
              <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-spotify-green'}`}>
                {timeLeft}s
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {gameState?.status === 'finished' ? (
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 text-spotify-green">Game Finished!</h2>
            <p className="text-spotify-light-gray mb-6">
              Thanks for playing! Redirecting to lobby...
            </p>
            <div className="bg-spotify-dark-gray rounded-2xl p-6 border border-spotify-gray max-w-md mx-auto">
              <h3 className="text-xl font-bold text-spotify-white mb-4">🏆 Final Scores</h3>
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
                  <p className="text-spotify-light-gray text-center">No scores available</p>
                )}
              </div>
            </div>
          </div>
        ) : gameState?.currentTrack ? (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Game Panel */}
            <div className="lg:col-span-2">
              <div className="bg-spotify-dark-gray rounded-2xl p-8 mb-8 border border-spotify-gray">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2 text-spotify-white">Guess the Song!</h2>
                  <p className="text-spotify-light-gray">Listen to the preview and guess whose song this is</p>
                  
                  {/* Progress Bar */}
                  {gameState.status === 'playing' && (
                    <div className="mt-4">
                      <div className="w-full bg-spotify-gray rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-spotify-green'}`}
                          style={{ width: `${(timeLeft / gameState.roundDuration) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Album Art */}
                {gameState.currentTrack.album?.images?.[0] && (
                  <div className="flex justify-center mb-6">
                    <Image 
                      src={gameState.currentTrack.album.images[0].url} 
                      alt="Album art"
                      width={192}
                      height={192}
                      className="rounded-lg shadow-lg"
                    />
                  </div>
                )}

                {/* Audio Controls */}
                {debugNoAudio ? (
                  <div className="text-center mb-6">
                    <div className="bg-yellow-600/20 border border-yellow-400 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-yellow-400 mb-2">🔧 Debug Mode: No Audio</h3>
                      <p className="text-spotify-light-gray">Audio preview is disabled for testing purposes</p>
                      <p className="text-sm text-spotify-light-gray mt-1">
                        Track: &quot;{gameState.currentTrack.name}&quot; by {gameState.currentTrack.artists?.[0]?.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <SpotifyEmbedPlayer 
                    trackId={gameState.currentTrack.id}
                    height={152}
                    className="mb-8"
                  />
                )}

                {/* Game State Based Content */}
                {gameState.status === 'waiting' && (
                  <div className="text-center">
                    <button
                      onClick={startRound}
                      className="bg-spotify-green hover:bg-spotify-dark-green p-4 rounded-lg font-semibold text-spotify-black transition-colors text-lg px-8"
                    >
                      Start First Round
                    </button>
                  </div>
                )}

                {gameState.status === 'playing' && !hasUserGuessed && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-center text-spotify-white">Whose song is this?</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {players.filter(player => player.user_id !== session?.user?.id).map((player) => (
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

                {(gameState.status === 'playing' && hasUserGuessed) && (
                  <div className="text-center">
                    <div className="bg-spotify-green/20 border border-spotify-green rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-spotify-green mb-2">Guess Submitted!</h3>
                      <p className="text-spotify-light-gray">Waiting for other players...</p>
                    </div>
                  </div>
                )}

                {gameState.status === 'voting' && (
                  <div className="text-center">
                    <div className="bg-blue-600/20 border border-blue-400 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Round Complete!</h3>
                      <p className="text-spotify-light-gray">
                        The answer was: <strong>{gameState.currentTrack.ownerName}</strong>
                      </p>
                      <p className="text-sm text-spotify-light-gray mt-2">Next round starting soon...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Debug Info */}
              <div className="bg-spotify-dark-gray border border-spotify-gray rounded-lg p-4 text-sm">
                <p className="mb-2 text-spotify-white"><strong>Track Info:</strong></p>
                <p className="text-spotify-light-gray">Song: {gameState.currentTrack.name}</p>
                <p className="text-spotify-light-gray">Artist: {gameState.currentTrack.artists[0]?.name}</p>
                <p className="text-spotify-light-gray">Owner: {gameState.currentTrack.ownerName}</p>
                <p className="text-spotify-light-gray">Preview URL: {gameState.currentTrack.preview_url ? '✅ Available' : '❌ Missing'}</p>
                <p className="text-spotify-light-gray">Status: {gameState.status}</p>
                <p className="text-spotify-light-gray">Round: {gameState.currentRound}/{gameState.totalRounds}</p>
                <p className="text-spotify-light-gray">Players Guessed: {gameState.playersGuessed.length}/{players.length}</p>
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

              {/* Players List */}
              <div className="bg-spotify-dark-gray rounded-2xl p-6 border border-spotify-gray">
                <h3 className="text-xl font-bold text-spotify-white mb-4">👥 Players ({players.length})</h3>
                <div className="space-y-2">
                  {players.map((player) => (
                    <div key={player.user_id} className="flex items-center justify-between p-2 bg-spotify-black rounded text-sm">
                      <span className="text-spotify-white">{player.username}</span>
                      {gameState?.playersGuessed.includes(player.user_id) && (
                        <span className="text-green-400">✅</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl mb-4">No tracks available</h2>
            <p className="text-white/70 mb-6">
              Game is starting or no tracks with previews are available.
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
