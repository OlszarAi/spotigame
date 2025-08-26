'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useGameState } from '@/hooks/useGameState'

interface GamePageProps {
  params: {
    lobbyId: string
  }
}

export default function GamePage({ params }: GamePageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const {
    lobby,
    loading,
    error,
    currentTrack,
    gameOptions,
    roundInfo,
    timeLeft,
    setTimeLeft,
    scores,
    authStatus,
    joinLobby,
    startGame,
    submitGuess,
    nextRound,
    authorizePlayer,
    fetchAuthStatus,
  } = useGameState(params.lobbyId)

  const [selectedGuess, setSelectedGuess] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }

    // Auto-join lobby if not already a player
    if (lobby && !lobby.players.find((p: any) => p.id === session?.user?.email)) {
      joinLobby()
    }
  }, [session, lobby])

  // Handle audio playback when track changes
  useEffect(() => {
    if (currentTrack?.preview_url && audioRef.current) {
      audioRef.current.src = currentTrack.preview_url
      audioRef.current.play().catch(console.error)
    }
  }, [currentTrack])

  // Timer countdown
  useEffect(() => {
    if (lobby?.status === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && lobby?.status === 'playing' && !isSubmitting) {
      // Time's up, submit current guess or skip
      handleTimeUp()
    }
  }, [timeLeft, lobby?.status, isSubmitting])

  const handleTimeUp = async () => {
    if (selectedGuess && !isSubmitting) {
      await handleSubmitGuess()
    } else {
      nextRound()
    }
  }

  const handleSubmitGuess = async () => {
    if (!selectedGuess || isSubmitting) return

    setIsSubmitting(true)
    try {
      await submitGuess(selectedGuess)
      setShowResults(true)
      
      setTimeout(() => {
        setShowResults(false)
        setSelectedGuess('')
        setIsSubmitting(false)
        nextRound()
      }, 3000)
    } catch (error) {
      console.error('Error submitting guess:', error)
      setIsSubmitting(false)
    }
  }

  const handleStartGame = async () => {
    if (isStartingGame) return
    
    setIsStartingGame(true)
    try {
      console.log('🎮 Starting game and collecting top tracks...')
      const result = await startGame()
      
      // Show success message with details
      if (result?.note) {
        alert(`Game started successfully!\n\n${result.note}\n\nTracks collected: ${result.trackCount}`)
      }
    } catch (error: any) {
      console.error('Start game error:', error)
      
      // Better error messages
      let errorMessage = 'Failed to start game'
      if (error.message?.includes('No top tracks found')) {
        errorMessage = '🎵 No recent listening history found!\n\nMake sure you\'ve been listening to music on Spotify in the last 4 weeks.'
      } else if (error.message?.includes('authentication')) {
        errorMessage = '🔐 Spotify authentication expired.\n\nPlease sign out and sign in again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
    } finally {
      setIsStartingGame(false)
    }
  }

  const handleAuthorizePlayer = async () => {
    if (isAuthorizing) return
    
    setIsAuthorizing(true)
    try {
      await authorizePlayer()
      // Success will be reflected by authStatus update
    } catch (error: any) {
      console.error('Authorization error:', error)
      alert(error.message || 'Failed to authorize. Please try again.')
    } finally {
      setIsAuthorizing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    )
  }

  if (!lobby) return null

  const isOwner = lobby.ownerId === session?.user?.email
  const shareableLink = typeof window !== 'undefined' ? `${window.location.origin}/game/${params.lobbyId}` : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">SpotiGame</h1>
          <div className="text-white">
            Lobby: {lobby.id.slice(0, 8)}...
          </div>
        </div>

        {/* Game Status */}
        {lobby.status === 'waiting' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Waiting for Game to Start</h2>
              
              {/* Share Link */}
              <div className="mb-6">
                <label className="block text-gray-300 font-semibold mb-2">
                  Share this link with friends:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareableLink}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded border border-gray-700"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(shareableLink)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Players List with Authorization Status */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Players ({lobby.players.length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {lobby.players.map((player) => {
                    const isAuthorized = authStatus?.[player.id] || false
                    const isCurrentUser = player.id === session?.user?.email
                    
                    return (
                      <div key={player.id} className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {player.image && (
                            <img src={player.image} alt={player.name} className="w-8 h-8 rounded-full" />
                          )}
                          <div>
                            <div className="text-white font-medium">{player.name}</div>
                            <div className="text-xs text-gray-400">
                              {player.id === lobby.ownerId && "Owner • "}
                              {isCurrentUser && "You • "}
                              <span className={isAuthorized ? "text-green-400" : "text-yellow-400"}>
                                {isAuthorized ? "✅ Authorized" : "⏳ Authorization needed"}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isCurrentUser && !isAuthorized && (
                          <button
                            onClick={handleAuthorizePlayer}
                            disabled={isAuthorizing}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            {isAuthorizing ? '🔄 Authorizing...' : 'Authorize Spotify'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Game Settings */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Game Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-300">
                  <div>Rounds: {lobby.settings.numberOfRounds}</div>
                  <div>Round Duration: {lobby.settings.roundDuration}s</div>
                  <div>Tracks per Player: {lobby.settings.tracksPerUser}</div>
                </div>
              </div>

              {/* Game Info */}
              <div className="mb-6 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-4">
                <h4 className="text-white font-bold mb-2">🎵 Multiplayer Mode</h4>
                <p className="text-white text-sm opacity-90">
                  All players need to authorize Spotify access to share their top tracks. 
                  The game will include tracks from all authorized players. 
                  You'll guess whose favorite songs are playing!
                </p>
              </div>

              {/* Authorization Status */}
              {lobby.players.length > 1 && (
                <div className="mb-6 bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Authorization Status</h4>
                  {(() => {
                    const authorizedCount = Object.values(authStatus).filter(Boolean).length
                    const totalPlayers = lobby.players.length
                    const allAuthorized = authorizedCount === totalPlayers
                    
                    return (
                      <div className="text-sm">
                        <div className={`font-medium ${allAuthorized ? 'text-green-400' : 'text-yellow-400'}`}>
                          {authorizedCount}/{totalPlayers} players authorized
                        </div>
                        {!allAuthorized && (
                          <div className="text-gray-400 mt-1">
                            Waiting for all players to authorize Spotify access...
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Owner Controls */}
              {isOwner && (
                <div className="space-y-4">
                  {(() => {
                    const authorizedCount = Object.values(authStatus).filter(Boolean).length
                    const totalPlayers = lobby.players.length
                    const allAuthorized = authorizedCount === totalPlayers
                    const canStart = allAuthorized && totalPlayers > 0
                    
                    return (
                      <button
                        onClick={handleStartGame}
                        disabled={isStartingGame || !canStart}
                        className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
                          canStart
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-600 cursor-not-allowed text-gray-300'
                        }`}
                      >
                        {isStartingGame 
                          ? '🔄 Starting Multiplayer Game...' 
                          : !allAuthorized 
                          ? `⏳ Waiting for Authorization (${authorizedCount}/${totalPlayers})`
                          : '🚀 Start Multiplayer Game'
                        }
                      </button>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Playing State */}
        {lobby.status === 'playing' && currentTrack && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-8">
              {/* Round Info */}
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-white mb-2">
                  Round {roundInfo.current} of {roundInfo.total}
                </div>
                <div className="text-xl text-gray-300">
                  Time Left: {timeLeft}s
                </div>
              </div>

              {/* Current Track */}
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-2">
                  {currentTrack.name}
                </h2>
                <p className="text-2xl text-gray-300 mb-4">
                  by {currentTrack.artist}
                </p>
                
                {/* Audio Player */}
                <audio ref={audioRef} controls className="mx-auto mb-4">
                  Your browser does not support the audio element.
                </audio>
              </div>

              {/* Guessing Options */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 text-center">
                  🎵 Whose favorite song is this?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedGuess(option.id)}
                      disabled={isSubmitting}
                      className={`p-4 rounded-lg border-2 transition-colors disabled:opacity-50 ${
                        selectedGuess === option.id
                          ? 'border-green-500 bg-green-900 text-white'
                          : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-green-400'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <button
                  onClick={handleSubmitGuess}
                  disabled={!selectedGuess || isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Guess'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Finished */}
        {lobby.status === 'finished' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">
                🎉 Game Finished! 🎉
              </h2>
              
              {/* Final Leaderboard */}
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-white mb-6 text-center">
                  Final Leaderboard
                </h3>
                <div className="space-y-4">
                  {scores
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.userId}
                        className={`flex justify-between items-center p-4 rounded-lg ${
                          index === 0 ? 'bg-yellow-900 border-2 border-yellow-500' :
                          index === 1 ? 'bg-gray-700 border-2 border-gray-400' :
                          index === 2 ? 'bg-orange-900 border-2 border-orange-600' :
                          'bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl font-bold text-white">
                            #{index + 1}
                          </span>
                          <span className="text-xl text-white">
                            {player.userName}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-white">
                          {player.score} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => router.push('/')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  Create New Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {showResults && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4">
                  {selectedGuess === currentTrack?.user_id ? '🎉 Correct!' : '❌ Wrong!'}
                </h3>
                <p className="text-gray-300 mb-4">
                  This was <strong>{currentTrack?.user_name}'s</strong> top track!
                </p>
                <div className="text-sm text-gray-400">
                  Next round starting in 3 seconds...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
