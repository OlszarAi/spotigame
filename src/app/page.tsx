'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Music, Plus, Users, LogOut, Settings } from 'lucide-react'
import { LobbyWithPlayers } from '@/types/database'
import Image from 'next/image'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lobbies, setLobbies] = useState<LobbyWithPlayers[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    fetchLobbies()
  }, [session, status, router])

  const fetchLobbies = async () => {
    try {
      const response = await fetch('/api/lobbies')
      if (response.ok) {
        const data = await response.json()
        setLobbies(data.lobbies || [])
      }
    } catch (error) {
      console.error('Error fetching lobbies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createLobby = async () => {
    if (!session?.user) return
    
    setIsCreating(true)
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${session.user.name || 'Player'}'s Lobby`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/lobby/${data.lobby.id}`)
      } else {
        console.error('Failed to create lobby')
      }
    } catch (error) {
      console.error('Error creating lobby:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="loading-dots text-spotify-green text-2xl mb-4">
            <span>●</span>
            <span>●</span>
            <span>●</span>
          </div>
          <p className="text-spotify-light-gray">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black">
      {/* Header */}
      <header className="border-b border-spotify-gray bg-spotify-dark-gray/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-spotify-green p-2 rounded-full">
              <Music className="w-6 h-6 text-spotify-black" />
            </div>
            <h1 className="text-2xl font-bold text-spotify-white">SpotiGame</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full"
                  width={32}
                  height={32}
                />
              )}
              <span className="text-spotify-white font-medium">
                {session?.user?.name || session?.user?.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-spotify-light-gray hover:text-spotify-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-spotify-white mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Player'}!
          </h2>
          <p className="text-spotify-light-gray">
            Create a new lobby or join an existing game
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={createLobby}
            disabled={isCreating}
            className="flex items-center justify-center space-x-2 bg-spotify-green hover:bg-spotify-dark-green text-spotify-black font-semibold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Plus className="w-5 h-5" />
            <span>{isCreating ? 'Creating...' : 'Create Lobby'}</span>
          </button>
          
          <button
            onClick={fetchLobbies}
            className="flex items-center justify-center space-x-2 border border-spotify-green text-spotify-green hover:bg-spotify-green hover:text-spotify-black font-semibold py-3 px-6 rounded-full transition-all duration-300"
          >
            <Users className="w-5 h-5" />
            <span>Refresh Lobbies</span>
          </button>
        </div>

        {/* Active Lobbies */}
        <div className="bg-spotify-dark-gray rounded-lg p-6 border border-spotify-gray">
          <h3 className="text-xl font-semibold text-spotify-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Active Lobbies
          </h3>
          
          {lobbies.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-spotify-light-gray mb-4">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active lobbies found</p>
                <p className="text-sm">Create a new lobby to start playing!</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="bg-spotify-black border border-spotify-gray rounded-lg p-4 hover:border-spotify-green transition-colors cursor-pointer"
                  onClick={() => router.push(`/lobby/${lobby.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-spotify-white truncate">
                      {lobby.name}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      lobby.status === 'waiting' 
                        ? 'bg-spotify-green text-spotify-black' 
                        : lobby.status === 'in_progress'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-spotify-gray text-spotify-white'
                    }`}>
                      {lobby.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-spotify-light-gray text-sm mb-2">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{lobby.lobby_players?.length || 0}/{lobby.max_players} players</span>
                  </div>
                  
                  <div className="flex items-center text-spotify-light-gray text-sm">
                    <Settings className="w-4 h-4 mr-1" />
                    <span>{lobby.settings.rounds} rounds</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
