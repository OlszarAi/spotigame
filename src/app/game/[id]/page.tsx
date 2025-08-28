'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { pusherClient } from '@/lib/pusher'
import { getSpotifyEmbedUrl } from '@/lib/spotify'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${params.id}`)
        if (response.ok) {
          const gameData = await response.json()
          setGame(gameData)
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
    })
    
    channel.bind('round-ended', (data: { results: any }) => {
      setShowResults(true)
      setTimeLeft(0)
    })
    
    channel.bind('game-ended', (data: { finalScores: any }) => {
      setGame(prev => prev ? { ...prev, status: 'FINISHED' } : null)
    })

    return () => {
      pusherClient.unsubscribe(`game-${game.id}`)
    }
  }, [game])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && currentRound && !hasVoted && !showResults) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Auto-submit if time runs out
            if (selectedPlayerId) {
              submitVote()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeLeft, currentRound, hasVoted, showResults, selectedPlayerId])

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
            <h1 className="text-2xl font-bold text-spotify-green">
              Round {currentRound.roundNumber} of {game.totalRounds}
            </h1>
            <p className="text-spotify-gray">Whose favorite song is this?</p>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-spotify-green'}`}>
              {timeLeft}s
            </div>
            <p className="text-sm text-spotify-gray">Time left</p>
          </div>
        </div>

        {/* Spotify Embed */}
        <div className="card mb-6">
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
        </div>

        {/* Player Selection */}
        {!hasVoted && !showResults && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Who do you think this song belongs to?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {game.participants.map((participant) => (
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

        {/* Waiting for others */}
        {hasVoted && !showResults && (
          <div className="card text-center">
            <h2 className="text-xl font-semibold mb-4">Vote submitted!</h2>
            <p className="text-spotify-gray">Waiting for other players to vote...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green mx-auto mt-4"></div>
          </div>
        )}

        {/* Round Results */}
        {showResults && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Round Results</h2>
            <p className="text-lg mb-4">
              This song belongs to: <span className="text-spotify-green font-bold">
                {game.participants.find(p => p.user.id === currentRound.ownerId)?.user.name}
              </span>
            </p>
            {/* Results details would go here */}
            <div className="text-center mt-6">
              <p className="text-spotify-gray">Next round starting soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
