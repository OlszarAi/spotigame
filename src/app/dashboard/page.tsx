'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isCreatingLobby, setIsCreatingLobby] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-spotify-gray">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const createLobby = async () => {
    setIsCreatingLobby(true)
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${session.user.name}'s Game`,
          maxPlayers: 8,
          roundCount: 5,
        }),
      })

      if (response.ok) {
        const lobby = await response.json()
        router.push(`/lobby/${lobby.id}`)
      } else {
        console.error('Failed to create lobby')
      }
    } catch (error) {
      console.error('Error creating lobby:', error)
    } finally {
      setIsCreatingLobby(false)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-spotify-green">SpotiGame</h1>
            <p className="text-spotify-gray">Welcome back, {session.user.name}!</p>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Create New Game</h2>
            <p className="text-spotify-gray mb-4">
              Start a new lobby and invite your friends to guess your favorite tracks!
            </p>
            <button
              onClick={createLobby}
              disabled={isCreatingLobby}
              className="btn-primary w-full"
            >
              {isCreatingLobby ? 'Creating...' : 'Create Lobby'}
            </button>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Join Game</h2>
            <p className="text-spotify-gray mb-4">
              Have a game code? Join an existing lobby and start playing!
            </p>
            <Link href="/join" className="btn-secondary w-full block text-center">
              Join Lobby
            </Link>
          </div>
        </div>

        {/* Recent Games */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
          <p className="text-spotify-gray">
            No recent games yet. Create your first lobby to get started!
          </p>
        </div>
      </div>
    </div>
  )
}
