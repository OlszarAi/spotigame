'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

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
  const [guess, setGuess] = useState('')
  const [canGuess, setCanGuess] = useState(true)

  const fetchGameSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/start`)
      if (response.ok) {
        const data = await response.json()
        setGameSession(data.gameSession)
        
        // Get a random track from the pool
        if (data.gameSession.track_pool && data.gameSession.track_pool.length > 0) {
          const tracksWithPreviews = data.gameSession.track_pool.filter((track: Track) => track.preview_url)
          console.log(`Available tracks with previews: ${tracksWithPreviews.length}`)
          
          if (tracksWithPreviews.length > 0) {
            const randomTrack = tracksWithPreviews[Math.floor(Math.random() * tracksWithPreviews.length)]
            setCurrentTrack(randomTrack)
            console.log('Selected track:', randomTrack)
          } else {
            console.error('No tracks with preview URLs available')
          }
        }
      } else if (response.status === 404) {
        router.push(`/lobby/${lobbyId}`)
      }
    } catch (error) {
      console.error('Error fetching game session:', error)
    } finally {
      setIsLoading(false)
    }
  }, [lobbyId, router])

  useEffect(() => {
    fetchGameSession()
  }, [fetchGameSession])

  useEffect(() => {
    if (currentTrack?.preview_url) {
      const audio = new Audio(currentTrack.preview_url)
      audio.preload = 'auto'
      setAudioElement(audio)
      
      return () => {
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
    if (!guess.trim() || !canGuess) return
    
    setCanGuess(false)
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guess: guess.trim() })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Guess result:', result)
        // Handle result (correct/incorrect, score, etc.)
      }
    } catch (error) {
      console.error('Error submitting guess:', error)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={goBackToLobby}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Lobby
          </button>
          <h1 className="text-3xl font-bold">SpotiGame</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {currentTrack ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Guess the Song!</h2>
                <p className="text-white/70">Listen to the preview and guess the song</p>
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
                  className="bg-green-600 hover:bg-green-700 p-4 rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8" />
                  )}
                </button>
                <div className="text-center">
                  <p className="text-sm text-white/70">
                    {audioElement ? (isPlaying ? 'Playing...' : 'Ready to play') : 'Loading...'}
                  </p>
                </div>
              </div>

              {/* Guess Input */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Enter your guess..."
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                  onKeyPress={(e) => e.key === 'Enter' && submitGuess()}
                  disabled={!canGuess}
                />
                <button
                  onClick={submitGuess}
                  disabled={!guess.trim() || !canGuess}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-4 rounded-lg font-semibold transition-colors"
                >
                  Submit Guess
                </button>
              </div>
            </div>

            {/* Debug Info */}
            <div className="bg-white/5 rounded-lg p-4 text-sm">
              <p className="mb-2"><strong>Track Info:</strong></p>
              <p>Song Owner: {currentTrack.ownerName}</p>
              <p>Preview URL: {currentTrack.preview_url ? '✅ Available' : '❌ Missing'}</p>
              <p>Track Pool Size: {gameSession.track_pool.length}</p>
              <p>Tracks with Previews: {gameSession.track_pool.filter(t => t.preview_url).length}</p>
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
