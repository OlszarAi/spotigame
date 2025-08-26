'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Lobby, Track, RoundResult, PlayerScore } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function GamePage({ params }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [selectedGuess, setSelectedGuess] = useState('')
  const [hasSubmittedGuess, setHasSubmittedGuess] = useState(false)
  const [roundResults, setRoundResults] = useState<RoundResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [finalResults, setFinalResults] = useState<PlayerScore[]>([])
  const [gameFinished, setGameFinished] = useState(false)
  const [error, setError] = useState('')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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

    // Listen for game events
    newSocket.on('lobby-updated', (updatedLobby: Lobby) => {
      setLobby(updatedLobby)
    })

    newSocket.on('round-started', ({ track, roundEndTime }: { track: Track; roundEndTime: Date }) => {
      setCurrentTrack(track)
      setSelectedGuess('')
      setHasSubmittedGuess(false)
      setShowResults(false)
      setRoundResults([])
      
      // Start audio playback
      if (audioRef.current && track.previewUrl) {
        audioRef.current.src = track.previewUrl
        audioRef.current.play().catch(console.error)
      }
      
      // Start countdown timer
      const endTime = new Date(roundEndTime).getTime()
      startTimer(endTime)
    })

    newSocket.on('round-ended', ({ results }: { results: RoundResult[] }) => {
      setRoundResults(results)
      setShowResults(true)
      
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause()
      }
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        setTimeRemaining(0)
      }
    })

    newSocket.on('game-finished', ({ finalResults }: { finalResults: PlayerScore[] }) => {
      setFinalResults(finalResults)
      setGameFinished(true)
      
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause()
      }
    })

    newSocket.on('error', (error: { message: string }) => {
      setError(error.message)
    })

    // Fetch initial lobby data
    fetchLobby()

    return () => {
      newSocket.emit('leave-lobby', {
        lobbyId: lobbyId,
        userId: session?.user?.spotifyId
      })
      newSocket.disconnect()
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [session, status, lobbyId, router])

  const startTimer = (endTime: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    timerRef.current = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      setTimeRemaining(Math.ceil(remaining / 1000))
      
      if (remaining <= 0) {
        clearInterval(timerRef.current!)
        // Auto-submit if no guess made
        if (!hasSubmittedGuess && selectedGuess) {
          submitGuess()
        }
      }
    }, 100)
  }

  const fetchLobby = async () => {
    if (!lobbyId) return
    
    try {
      const response = await fetch(`/api/lobby?id=${lobbyId}`)
      if (!response.ok) {
        throw new Error('Lobby not found')
      }
      const { lobby } = await response.json()
      setLobby(lobby)
      
      if (lobby.status !== 'playing' && lobby.status !== 'finished') {
        router.push(`/lobby/${lobbyId}`)
      }
    } catch (error) {
      setError('Failed to load game')
    }
  }

  const submitGuess = () => {
    if (!socket || !selectedGuess || hasSubmittedGuess || !lobbyId) return
    
    socket.emit('submit-guess', {
      lobbyId: lobbyId,
      guessedUserId: selectedGuess
    })
    
    setHasSubmittedGuess(true)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
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
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (gameFinished) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-bold text-white mb-6">🏆 Game Over!</h1>
          
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Final Results</h2>
            
            <div className="space-y-4">
              {finalResults.map((result, index) => (
                <div
                  key={result.playerId}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index === 0 ? 'bg-yellow-600 bg-opacity-30' : 
                    index === 1 ? 'bg-gray-400 bg-opacity-30' : 
                    index === 2 ? 'bg-orange-600 bg-opacity-30' : 
                    'bg-white bg-opacity-10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-white font-medium">{result.playerName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-lg">{result.score} points</div>
                    <div className="text-gray-300 text-sm">
                      {result.correctGuesses}/{result.totalRounds} correct
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-200"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showResults) {
    const currentPlayer = session?.user ? lobby.players.find(p => p.id === session.user.spotifyId) : null
    const currentPlayerResult = currentPlayer ? roundResults.find(r => r.playerId === currentPlayer.id) : null
    
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Round Results</h1>
          
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              The song belonged to: {currentTrack?.ownerUserName}
            </h2>
            
            {lobby.settings.showTrackInfo && currentTrack && (
              <div className="mb-6 p-4 bg-black bg-opacity-30 rounded-lg">
                <p className="text-white font-medium">{currentTrack.title}</p>
                <p className="text-gray-300">{currentTrack.artist}</p>
              </div>
            )}
            
            {currentPlayerResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                currentPlayerResult.isCorrect ? 'bg-green-600 bg-opacity-30' : 'bg-red-600 bg-opacity-30'
              }`}>
                <p className="text-white font-medium">
                  {currentPlayerResult.isCorrect ? '✓ Correct!' : '✗ Wrong'}
                </p>
                <p className="text-gray-300">
                  You guessed: {currentPlayerResult.guessedUserName}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="text-white font-medium">All Results:</h3>
              {roundResults.map(result => (
                <div key={result.playerId} className="flex justify-between text-sm">
                  <span className="text-gray-300">{result.playerName}</span>
                  <span className={result.isCorrect ? 'text-green-400' : 'text-red-400'}>
                    {result.isCorrect ? `✓ +${result.points}` : '✗ +0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-gray-300">
            {lobby.gameState && (
              <p>
                Round {lobby.gameState.currentRound} of {lobby.settings.numberOfRounds}
              </p>
            )}
            <p>Next round starting soon...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🎵 SpotiGame</h1>
          {lobby.gameState && (
            <p className="text-green-400">
              Round {lobby.gameState.currentRound} of {lobby.settings.numberOfRounds}
            </p>
          )}
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className={`text-6xl font-bold ${timeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
            {timeRemaining}
          </div>
          <p className="text-gray-300">seconds remaining</p>
        </div>

        {/* Track Info */}
        {currentTrack && (
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎵</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Whose song is this?
              </h2>
            </div>
            
            {lobby.settings.showTrackInfo && (
              <div className="mb-6 p-4 bg-black bg-opacity-30 rounded-lg">
                <p className="text-white font-medium">{currentTrack.title}</p>
                <p className="text-gray-300">{currentTrack.artist}</p>
              </div>
            )}
            
            <audio ref={audioRef} loop />
          </div>
        )}

        {/* Player Choices */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Choose a player:</h3>
          
          <div className="grid gap-3">
            {lobby.players.map((player) => (
              <button
                key={player.id}
                onClick={() => !hasSubmittedGuess && setSelectedGuess(player.id)}
                disabled={hasSubmittedGuess}
                className={`p-4 rounded-lg transition duration-200 flex items-center space-x-3 ${
                  selectedGuess === player.id
                    ? 'bg-green-600 bg-opacity-50 border-2 border-green-400'
                    : hasSubmittedGuess
                    ? 'bg-gray-600 bg-opacity-30 cursor-not-allowed'
                    : 'bg-white bg-opacity-20 hover:bg-opacity-30 border-2 border-transparent'
                }`}
              >
                {player.image && (
                  <img
                    src={player.image}
                    alt={player.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <span className="text-white font-medium">{player.name}</span>
                {selectedGuess === player.id && (
                  <span className="ml-auto text-green-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={submitGuess}
            disabled={!selectedGuess || hasSubmittedGuess}
            className={`px-8 py-3 rounded-lg font-bold text-lg transition duration-200 ${
              hasSubmittedGuess
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : selectedGuess
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
          >
            {hasSubmittedGuess ? 'Guess Submitted!' : 'Submit Guess'}
          </button>
        </div>

        {/* Scoreboard */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Current Scores</h3>
          
          <div className="space-y-2">
            {lobby.players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <div key={player.id} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{index + 1}.</span>
                    <span className="text-white">{player.name}</span>
                  </div>
                  <span className="text-green-400 font-bold">{player.score}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
