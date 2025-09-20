'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { pusherClient } from '@/lib/pusher'
import { getSpotifyEmbedUrl } from '@/lib/spotify'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProgressBar, TimerProgress } from '@/components/ui/ProgressBar'
import { 
  PlayIcon, 
  PauseIcon,
  TrophyIcon,
  UserGroupIcon,
  ClockIcon,
  MusicalNoteIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  StarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { 
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
  TrophyIcon as TrophyIconSolid
} from '@heroicons/react/24/solid'

interface Player {
  id: string
  name: string
  image?: string
  score: number
}

interface Round {
  id: string
  roundNumber: number
  trackName: string
  trackArtist: string
  trackUri: string
  ownerId: string
  timeLimit: number
  status: 'PLAYING' | 'FINISHED'
}

interface Game {
  id: string
  currentRound: number
  totalRounds: number
  status: 'WAITING' | 'LOADING' | 'PLAYING' | 'FINISHED'
  participants: Array<{
    user: Player
    score: number
  }>
}

export default function GamePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [hasVoted, setHasVoted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [breakTimeLeft, setBreakTimeLeft] = useState<number>(0)
  const [isInBreak, setIsInBreak] = useState(false)
  const [roundOwnerName, setRoundOwnerName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [fallbackTimer, setFallbackTimer] = useState<NodeJS.Timeout | null>(null)

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${params.id}`)
      if (response.ok) {
        const gameData = await response.json()
        setGame(gameData)
        // Set current round if it exists in the game data
        if (gameData.currentRound) {
          setCurrentRound(gameData.currentRound)
          setTimeLeft(gameData.currentRound.timeLimit)
          // Check if user has already voted for the current round
          checkIfUserHasVoted(gameData.currentRound.id)
        }
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching game:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    if (session?.user?.id) {
      fetchGame()
    }
  }, [session, params.id, router, status])

  useEffect(() => {
    if (!game) return

    // Subscribe to game updates
    const channel = pusherClient.subscribe(`game-${game.id}`)
    
    channel.bind('round-started', (data: { round: Round }) => {
      setCurrentRound(data.round)
      setTimeLeft(data.round.timeLimit)
      setHasVoted(false)
      setSelectedPlayerId(null)
      setShowResults(false)
      setIsInBreak(false)
      setBreakTimeLeft(0)
      
      // Check if user has already voted for this round
      checkIfUserHasVoted(data.round.id)
      // Fetch updated game state to get current scores
      fetchGame()
    })

    // New event for Vercel compatibility - handles delayed round start
    channel.bind('round-will-start', (data: { round: Round, delaySeconds: number }) => {
      console.log('[round-will-start] Received round will start event:', data)
      
      // Clear any existing fallback timer
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        setFallbackTimer(null)
      }
      
      // Start countdown and then trigger round start
      setIsInBreak(true)
      setBreakTimeLeft(data.delaySeconds)
      
      // Store the next round data
      const nextRoundRef = data.round
      
      // Set timer to start round after delay
      setTimeout(() => {
        console.log('[round-will-start] Starting next round after delay')
        setCurrentRound(nextRoundRef)
        setTimeLeft(nextRoundRef.timeLimit)
        setHasVoted(false)
        setSelectedPlayerId(null)
        setShowResults(false)
        setIsInBreak(false)
        setBreakTimeLeft(0)
        
        // Check if user has already voted for this round
        checkIfUserHasVoted(nextRoundRef.id)
        // Fetch updated game state to get current scores
        fetchGame()
      }, data.delaySeconds * 1000)
    })
    
    channel.bind('round-ended', (data: { results: any }) => {
      console.log('[round-ended] Received round ended event:', data)
      setShowResults(true)
      setTimeLeft(0)
      
      // Clear any existing fallback timer
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        setFallbackTimer(null)
      }
      
      // Find the round owner name
      const ownerName = game.participants.find((p: any) => p.user.id === data.results.correctAnswer)?.user.name || 'Unknown'
      setRoundOwnerName(ownerName)
      
      // Start 5-second break to show results
      setIsInBreak(true)
      setBreakTimeLeft(5)
      
      // Set fallback timer in case round-will-start event doesn't come
      const timer = setTimeout(() => {
        console.log('[fallback] No round-will-start event received, forcing next round')
        forceNextRound()
      }, 12000) // 12 seconds fallback
      
      setFallbackTimer(timer)
      
      // Fetch updated game state to get new scores
      fetchGame()
    })
    
    channel.bind('game-ended', (data: { finalScores: any }) => {
      setGame((prev: any) => prev ? { ...prev, status: 'FINISHED' } : null)
    })

    return () => {
      pusherClient.unsubscribe(`game-${game.id}`)
      // Clear any fallback timer
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        setFallbackTimer(null)
      }
    }
  }, [game])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && currentRound && !showResults) {
      const timer = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            // Auto-submit vote if user has selected someone
            if (selectedPlayerId && !hasVoted) {
              submitVote()
            } else if (!hasVoted) {
              // If no selection, just end the round
              endRound()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeLeft, currentRound, hasVoted, showResults, selectedPlayerId])

  // Break timer countdown
  useEffect(() => {
    if (isInBreak && breakTimeLeft > 0) {
      const timer = setInterval(() => {
        setBreakTimeLeft((prev: number) => {
          const newValue = prev - 1
          if (newValue <= 0) {
            return 0
          }
          return newValue
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isInBreak, breakTimeLeft])

  const endRound = async () => {
    try {
      await fetch(`/api/games/${params.id}/end-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Error ending round:', error)
    }
  }

  const forceNextRound = async () => {
    try {
      console.log('[forceNextRound] Attempting to force next round')
      const response = await fetch(`/api/games/${params.id}/force-next-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[forceNextRound] Successfully forced next round:', data)
        // Refresh game state
        fetchGame()
      } else {
        console.error('[forceNextRound] Failed to force next round:', response.status)
      }
    } catch (error) {
      console.error('[forceNextRound] Error forcing next round:', error)
    }
  }

  const checkIfUserHasVoted = async (roundId: string) => {
    try {
      const response = await fetch(`/api/games/${params.id}/vote/check?roundId=${roundId}`)
      if (response.ok) {
        const data = await response.json()
        setHasVoted(data.hasVoted)
      }
    } catch (error) {
      console.error('Error checking vote status:', error)
    }
  }

  const submitVote = async () => {
    if (!selectedPlayerId || !currentRound || hasVoted) return

    try {
      const response = await fetch(`/api/games/${params.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guessedUserId: selectedPlayerId,
        }),
      })

      if (response.ok) {
        setHasVoted(true)
      } else {
        const errorData = await response.json()
        // If already voted, mark as voted to prevent further attempts
        if (response.status === 400 && errorData.error?.includes('already voted')) {
          setHasVoted(true)
        }
        console.error('Vote submission error:', errorData.error)
      }
    } catch (error) {
      console.error('Error submitting vote:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-spotify-gray">Loading game...</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Game not found</h1>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (game.status === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <h2 className="text-2xl font-bold text-spotify-green mt-4">Preparing Your Game...</h2>
          <p className="text-spotify-gray mt-2">We're selecting the best tracks from everyone's favorites!</p>
        </div>
      </div>
    )
  }

  if (game.status === 'FINISHED') {
    const sortedParticipants = [...game.participants].sort((a, b) => b.score - a.score)
    
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-spotify-green mb-8">Game Over!</h1>
          
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Final Scores</h2>
            <div className="space-y-4">
              {sortedParticipants.map((participant, index) => (
                <div key={participant.user.id} className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-900 border-yellow-600' : 'bg-zinc-800'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold">#{index + 1}</span>
                    {participant.user.image && (
                      <img 
                        src={participant.user.image} 
                        alt={participant.user.name} 
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <span className="text-xl font-semibold">{participant.user.name}</span>
                    {index === 0 && <span className="text-yellow-400">👑</span>}
                  </div>
                  <span className="text-2xl font-bold text-spotify-green">{participant.score}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
              <button onClick={() => router.push('/dashboard')} className="btn-primary">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentRound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-spotify-green">Waiting for next round...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            {isInBreak ? (
              <>
                <h1 className="text-2xl font-bold text-spotify-green">
                  Round {currentRound.roundNumber} Finished
                </h1>
                <p className="text-spotify-gray">Preparing next round...</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-spotify-green">
                  Round {currentRound.roundNumber} of {game.totalRounds}
                </h1>
                <p className="text-spotify-gray">Whose favorite song is this?</p>
              </>
            )}
          </div>
          <div className="text-center">
            {isInBreak && breakTimeLeft > 0 ? (
              <>
                <div className="text-3xl font-bold text-spotify-green">
                  {breakTimeLeft}s
                </div>
                <p className="text-sm text-spotify-gray">Next round</p>
              </>
            ) : !isInBreak ? (
              <>
                <div className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-spotify-green'}`}>
                  {timeLeft}s
                </div>
                <p className="text-sm text-spotify-gray">Time left</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-spotify-gray">
                  ⏳
                </div>
                <p className="text-sm text-spotify-gray">Loading...</p>
              </>
            )}
          </div>
        </div>

        {/* Game Content - Hidden during break */}
        {!isInBreak && (
          <div className="card mb-6">
            {(game as any).gameMode === 'ARTISTS' ? (
              // Artist Mode Display
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">
                  {(currentRound as any).artistName}
                </h2>
                {(currentRound as any).artistImage && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={(currentRound as any).artistImage}
                      alt={(currentRound as any).artistName}
                      className="w-64 h-64 object-cover rounded-lg shadow-lg"
                    />
                  </div>
                )}
                <p className="text-spotify-gray">
                  Whose favorite artist is this?
                </p>
              </div>
            ) : (
              // Song Mode Display (existing functionality)
              <>
                <h2 className="text-xl font-semibold mb-4">
                  {currentRound.trackName} - {currentRound.trackArtist}
                </h2>
                <iframe
                  src={getSpotifyEmbedUrl(currentRound.trackUri)}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                />
              </>
            )}
          </div>
        )}

        {/* Player Selection - Hidden during break */}
        {!hasVoted && !showResults && !isInBreak && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">
              {(game as any).gameMode === 'ARTISTS' 
                ? 'Who do you think this artist belongs to?' 
                : 'Who do you think this song belongs to?'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {game.participants.map((participant: any) => (
                <button
                  key={participant.user.id}
                  onClick={() => setSelectedPlayerId(participant.user.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPlayerId === participant.user.id
                      ? 'border-spotify-green bg-green-900'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {participant.user.image && (
                      <img 
                        src={participant.user.image} 
                        alt={participant.user.name} 
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <span className="font-medium">{participant.user.name}</span>
                    <span className="text-sm text-spotify-gray">Score: {participant.score}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {selectedPlayerId && (
              <div className="mt-6 text-center">
                <button onClick={submitVote} className="btn-primary">
                  Submit Vote
                </button>
              </div>
            )}
          </div>
        )}

        {/* Waiting for others - Hidden during break */}
        {hasVoted && !showResults && !isInBreak && (
          <div className="card text-center">
            <h2 className="text-xl font-semibold mb-4">Vote submitted!</h2>
            <p className="text-spotify-gray">Waiting for other players to vote...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green mx-auto mt-4"></div>
          </div>
        )}

        {/* Round Results & Break */}
        {showResults && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Round Results</h2>
            <p className="text-lg mb-4">
              This song belongs to: <span className="text-spotify-green font-bold">
                {roundOwnerName}
              </span>
            </p>
            
            {isInBreak ? (
              <div className="text-center mt-6">
                {breakTimeLeft > 0 ? (
                  <>
                    <div className="text-6xl font-bold text-spotify-green mb-4">
                      {breakTimeLeft}
                    </div>
                    <p className="text-lg text-spotify-gray">Next round starting in...</p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-spotify-green mb-4">
                      0
                    </div>
                    <p className="text-lg text-spotify-gray">Starting next round...</p>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center mt-6">
                <p className="text-spotify-gray">Starting next round...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green mx-auto mt-4"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
