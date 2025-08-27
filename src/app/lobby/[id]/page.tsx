'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { 
  Users, 
  Settings, 
  Copy, 
  Play, 
  Crown, 
  UserCheck, 
  Clock,
  Music,
  Eye,
  EyeOff
} from 'lucide-react'
import { LobbyWithPlayers, LobbySettings } from '@/types/database'
import { supabase } from '@/lib/supabase'

export default function LobbyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const lobbyId = params.id as string

  const [lobby, setLobby] = useState<LobbyWithPlayers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<LobbySettings | null>(null)
  const [isReady, setIsReady] = useState(false)

  const fetchLobby = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}`)
      if (response.ok) {
        const data = await response.json()
        setLobby(data.lobby)
        setSettings(data.lobby.settings)
        
        // Check if current user is in lobby and ready
        const userId = session?.user ? (session.user as { id: string }).id : null
        const currentPlayer = data.lobby.players?.find(
          (p: { user_id: string; is_ready: boolean }) => p.user_id === userId
        )
        setIsReady(currentPlayer?.is_ready || false)
      } else if (response.status === 404) {
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching lobby:', error)
    } finally {
      setIsLoading(false)
    }
  }, [lobbyId, session?.user, router])

  const setupRealtimeSubscription = useCallback(() => {
    const channel = supabase
      .channel(`lobby-${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobbyId}`
        },
        () => {
          fetchLobby()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players',
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          fetchLobby()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lobbyId, fetchLobby])

  useEffect(() => {
    if (!(session?.user as { id: string })?.id) {
      router.push('/login')
      return
    }

    fetchLobby()
    setupRealtimeSubscription()
  }, [session, lobbyId, router, fetchLobby, setupRealtimeSubscription])

  const joinLobby = async () => {
    if (!(session?.user as { id: string })?.id) return
    
    setIsJoining(true)
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchLobby()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to join lobby')
      }
    } catch (error) {
      console.error('Error joining lobby:', error)
      alert('Failed to join lobby')
    } finally {
      setIsJoining(false)
    }
  }

  const toggleReady = async () => {
    if (!(session?.user as { id: string })?.id) return
    
    try {
      // This would need a separate API endpoint to update player ready status
      // For now, we'll simulate it
      setIsReady(!isReady)
    } catch (error) {
      console.error('Error toggling ready:', error)
    }
  }

  const updateSettings = async (newSettings: LobbySettings) => {
    if (!(session?.user as { id: string })?.id || lobby?.creator_id !== (session?.user as { id: string })?.id) return
    
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: newSettings })
      })
      
      if (response.ok) {
        setSettings(newSettings)
        setShowSettings(false)
        await fetchLobby()
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  const startGame = async () => {
    if (!(session?.user as { id: string })?.id) return
    
    setIsStarting(true)
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/start`, {
        method: 'POST'
      })
      
      if (response.ok) {
        router.push(`/game/${lobbyId}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to start game')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Failed to start game')
    } finally {
      setIsStarting(false)
    }
  }

  const copyLobbyLink = async () => {
    const link = `${window.location.origin}/lobby/${lobbyId}`
    try {
      await navigator.clipboard.writeText(link)
      // You could show a toast here
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="loading-dots text-spotify-green text-2xl mb-4">
            <span>●</span>
            <span>●</span>
            <span>●</span>
          </div>
          <p className="text-spotify-light-gray">Loading lobby...</p>
        </div>
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-spotify-light-gray">Lobby not found</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 spotify-button"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const isCreator = lobby.creator_id === (session?.user as { id: string })?.id
  const currentPlayer = lobby.players?.find(p => p.user_id === (session?.user as { id: string })?.id)
  const isInLobby = !!currentPlayer
  const allPlayersReady = lobby.players?.every(p => p.is_ready) || false
  const canStart = isCreator && lobby.players && lobby.players.length >= 2 && allPlayersReady

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black">
      {/* Header */}
      <header className="border-b border-spotify-gray bg-spotify-dark-gray/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.push('/')}
              className="text-spotify-light-gray hover:text-spotify-white transition-colors"
            >
              ←
            </button>
            <div className="bg-spotify-green p-2 rounded-full">
              <Music className="w-6 h-6 text-spotify-black" />
            </div>
            <h1 className="text-2xl font-bold text-spotify-white">{lobby.name}</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyLobbyLink}
              className="flex items-center space-x-1 text-spotify-light-gray hover:text-spotify-white transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Players Section */}
          <div className="lg:col-span-2">
            <div className="bg-spotify-dark-gray rounded-lg p-6 border border-spotify-gray">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-spotify-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Players ({lobby.players?.length || 0}/{lobby.max_players})
                </h2>
                
                {!isInLobby && (
                  <button
                    onClick={joinLobby}
                    disabled={isJoining}
                    className="spotify-button-secondary text-sm"
                  >
                    {isJoining ? 'Joining...' : 'Join Lobby'}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {lobby.players?.map((player) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between bg-spotify-black rounded-lg p-3 border border-spotify-gray"
                  >
                    <div className="flex items-center space-x-3">
                      {player.avatar_url && (
                        <Image
                          src={player.avatar_url}
                          alt={player.username}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-spotify-white font-medium">
                            {player.username}
                          </span>
                          {player.user_id === lobby.creator_id && (
                            <Crown className="w-4 h-4 text-spotify-green" />
                          )}
                        </div>
                        <span className="text-xs text-spotify-light-gray">
                          Joined {new Date(player.joined_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {player.is_ready ? (
                        <span className="flex items-center text-spotify-green text-sm">
                          <UserCheck className="w-4 h-4 mr-1" />
                          Ready
                        </span>
                      ) : (
                        <span className="flex items-center text-spotify-light-gray text-sm">
                          <Clock className="w-4 h-4 mr-1" />
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isInLobby && (
                <div className="mt-4 pt-4 border-t border-spotify-gray">
                  <button
                    onClick={toggleReady}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                      isReady
                        ? 'bg-spotify-green text-spotify-black hover:bg-spotify-dark-green'
                        : 'border border-spotify-green text-spotify-green hover:bg-spotify-green hover:text-spotify-black'
                    }`}
                  >
                    {isReady ? 'Ready!' : 'Mark as Ready'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Settings & Game Control */}
          <div className="space-y-6">
            {/* Game Settings */}
            <div className="bg-spotify-dark-gray rounded-lg p-6 border border-spotify-gray">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-spotify-white flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Settings
                </h3>
                {isCreator && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-spotify-green hover:text-spotify-dark-green transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {showSettings && settings ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-spotify-light-gray mb-1">
                      Number of Rounds
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="20"
                      value={settings.rounds}
                      onChange={(e) => setSettings({
                        ...settings,
                        rounds: parseInt(e.target.value)
                      })}
                      className="spotify-input w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-spotify-light-gray mb-1">
                      Snippet Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="60"
                      value={settings.snippet_duration}
                      onChange={(e) => setSettings({
                        ...settings,
                        snippet_duration: parseInt(e.target.value)
                      })}
                      className="spotify-input w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.show_track_info}
                        onChange={(e) => setSettings({
                          ...settings,
                          show_track_info: e.target.checked
                        })}
                        className="rounded text-spotify-green"
                      />
                      <span className="text-sm text-spotify-light-gray">
                        Show track title & artist
                      </span>
                    </label>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateSettings(settings)}
                      className="spotify-button text-sm flex-1"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="spotify-button-secondary text-sm flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-spotify-light-gray">Rounds:</span>
                    <span className="text-spotify-white">{lobby.settings.rounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-spotify-light-gray">Duration:</span>
                    <span className="text-spotify-white">{lobby.settings.snippet_duration}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-spotify-light-gray">Track Info:</span>
                    {lobby.settings.show_track_info ? (
                      <Eye className="w-4 h-4 text-spotify-green" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-spotify-gray" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Start Game */}
            {isCreator && (
              <div className="bg-spotify-dark-gray rounded-lg p-6 border border-spotify-gray">
                <h3 className="text-lg font-semibold text-spotify-white mb-4">
                  Game Control
                </h3>
                
                {!canStart && (
                  <div className="mb-4 text-sm text-spotify-light-gray">
                    {lobby.players && lobby.players.length < 2 ? (
                      <p>• Need at least 2 players</p>
                    ) : !allPlayersReady ? (
                      <p>• All players must be ready</p>
                    ) : null}
                  </div>
                )}
                
                <button
                  onClick={startGame}
                  disabled={!canStart || isStarting}
                  className="w-full spotify-button flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Play className="w-5 h-5" />
                  <span>{isStarting ? 'Starting...' : 'Start Game'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
