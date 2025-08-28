'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { pusherClient } from '@/lib/pusher'

interface LobbyMember {
  id: string
  userId: string
  isReady: boolean
  user: {
    id: string
    name: string
    image?: string
  }
}

interface Lobby {
  id: string
  name: string
  hostId: string
  maxPlayers: number
  roundCount: number
  host: {
    id: string
    name: string
  }
  members: LobbyMember[]
}

export default function LobbyPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [gameStarting, setGameStarting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    const fetchLobby = async () => {
      try {
        const response = await fetch(`/api/lobbies/${params.id}`)
        if (response.ok) {
          const lobbyData = await response.json()
          setLobby(lobbyData)
          
          // Check if current user is ready
          const currentMember = lobbyData.members.find(
            (member: LobbyMember) => member.user.id === session?.user?.id
          )
          setIsReady(currentMember?.isReady || false)
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error fetching lobby:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchLobby()
    }
  }, [session, params.id, router, status])

  useEffect(() => {
    if (!lobby) return

    // Subscribe to lobby updates
    const channel = pusherClient.subscribe(`lobby-${lobby.id}`)
    
    channel.bind('member-joined', (data: { member: LobbyMember }) => {
      setLobby(prev => prev ? {
        ...prev,
        members: [...prev.members, data.member]
      } : null)
    })
    
    channel.bind('member-left', (data: { userId: string }) => {
      setLobby(prev => prev ? {
        ...prev,
        members: prev.members.filter(member => member.userId !== data.userId)
      } : null)
    })
    
    channel.bind('member-ready-changed', (data: { userId: string, isReady: boolean }) => {
      setLobby(prev => prev ? {
        ...prev,
        members: prev.members.map(member => 
          member.userId === data.userId 
            ? { ...member, isReady: data.isReady }
            : member
        )
      } : null)
      
      if (data.userId === session?.user?.id) {
        setIsReady(data.isReady)
      }
    })
    
    channel.bind('game-starting', () => {
      setGameStarting(true)
    })
    
    channel.bind('game-started', (data: { gameId: string }) => {
      router.push(`/game/${data.gameId}`)
    })

    return () => {
      pusherClient.unsubscribe(`lobby-${lobby.id}`)
    }
  }, [lobby, session?.user?.id, router])

  const toggleReady = async () => {
    if (!lobby || !session?.user?.id) return

    try {
      const response = await fetch(`/api/lobbies/${lobby.id}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isReady: !isReady }),
      })

      if (!response.ok) {
        console.error('Failed to toggle ready status')
      }
    } catch (error) {
      console.error('Error toggling ready:', error)
    }
  }

  const startGame = async () => {
    if (!lobby || !session?.user?.id || lobby.hostId !== session.user.id) return

    try {
      const response = await fetch(`/api/lobbies/${lobby.id}/start`, {
        method: 'POST',
      })

      if (!response.ok) {
        console.error('Failed to start game')
      }
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  const leaveLobby = async () => {
    if (!lobby || !session?.user?.id) return

    try {
      await fetch(`/api/lobbies/${lobby.id}/leave`, {
        method: 'POST',
      })
      router.push('/dashboard')
    } catch (error) {
      console.error('Error leaving lobby:', error)
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-spotify-gray">Loading lobby...</p>
        </div>
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Lobby not found</h1>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isHost = lobby.hostId === session?.user?.id
  const allReady = lobby.members.every(member => member.isReady)
  const canStart = isHost && lobby.members.length >= 2 && allReady

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-spotify-green">{lobby.name}</h1>
            <p className="text-spotify-gray">
              Host: {lobby.host.name} • {lobby.members.length}/{lobby.maxPlayers} players
            </p>
          </div>
          <button onClick={leaveLobby} className="btn-secondary">
            Leave Lobby
          </button>
        </div>

        {gameStarting && (
          <div className="card mb-8 bg-green-900 border-green-700">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-green-400">Game Starting!</h2>
              <p className="text-green-300">Please wait while we prepare your tracks...</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Members */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Players</h2>
            <div className="space-y-3">
              {lobby.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {member.user.image && (
                      <img 
                        src={member.user.image} 
                        alt={member.user.name} 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium">{member.user.name}</p>
                      {member.userId === lobby.hostId && (
                        <p className="text-sm text-spotify-green">Host</p>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    member.isReady 
                      ? 'bg-green-800 text-green-200' 
                      : 'bg-red-800 text-red-200'
                  }`}>
                    {member.isReady ? 'Ready' : 'Not Ready'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
            <div className="space-y-4">
              <div>
                <p className="text-spotify-gray">Rounds: {lobby.roundCount}</p>
                <p className="text-spotify-gray">Max Players: {lobby.maxPlayers}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={toggleReady}
                  disabled={gameStarting}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    isReady
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isReady ? 'Not Ready' : 'Ready'}
                </button>

                {isHost && (
                  <button
                    onClick={startGame}
                    disabled={!canStart || gameStarting}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gameStarting ? 'Starting...' : 'Start Game'}
                  </button>
                )}

                {!canStart && isHost && (
                  <p className="text-sm text-spotify-gray text-center">
                    {lobby.members.length < 2 
                      ? 'Need at least 2 players to start'
                      : 'All players must be ready to start'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Game Code */}
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Invite Friends</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-spotify-gray mb-2">Game Code:</p>
              <code className="bg-zinc-800 px-4 py-2 rounded-lg text-spotify-green font-mono text-lg">
                {lobby.id.slice(0, 8).toUpperCase()}
              </code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(lobby.id.slice(0, 8).toUpperCase())}
              className="btn-secondary"
            >
              Copy Code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
