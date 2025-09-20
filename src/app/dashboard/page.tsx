'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  PlusIcon, 
  UserGroupIcon,
  ArrowRightIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  MusicalNoteIcon,
  UserIcon,
  ClockIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isCreatingLobby, setIsCreatingLobby] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [lobbyName, setLobbyName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [roundCount, setRoundCount] = useState(5)
  const [gameMode, setGameMode] = useState<'SONGS' | 'ARTISTS'>('SONGS')
  const [timeRange, setTimeRange] = useState<'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'>('SHORT_TERM')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
    if (session?.user?.name) {
      setLobbyName(`${(session as any)?.user?.name || 'Player'}'s Game`)
    }
  }, [status, router, session?.user?.name])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" text="Loading dashboard..." />
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
          name: lobbyName || `${session?.user?.name || 'Player'}'s Game`,
          maxPlayers,
          roundCount,
          gameMode,
          timeRange,
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

  const quickCreateLobby = async () => {
    setIsCreatingLobby(true)
    try {
      const response = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${session?.user?.name || 'Player'}'s Game`,
          maxPlayers: 8,
          roundCount: 5,
          gameMode: 'SONGS',
          timeRange: 'SHORT_TERM',
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen mobile-safe-area"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-8"
        >
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-bold gradient-text">SpotiGame</h1>
            <p className="text-spotify-gray-light text-lg">
              Welcome back, <span className="text-spotify-white font-medium">{session?.user?.name}</span>! 🎵
            </p>
          </div>
          <Button
            onClick={() => signOut()}
            variant="secondary"
            className="shrink-0"
          >
            Sign Out
          </Button>
        </motion.header>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card variant="glow" className="text-center">
            <CardContent className="pt-6">
              <UserGroupIcon className="w-8 h-8 text-spotify-green mx-auto mb-2" />
              <p className="text-2xl font-bold text-spotify-white">0</p>
              <p className="text-sm text-spotify-gray">Games Played</p>
            </CardContent>
          </Card>
          <Card variant="glow" className="text-center">
            <CardContent className="pt-6">
              <PlayIcon className="w-8 h-8 text-spotify-blue mx-auto mb-2" />
              <p className="text-2xl font-bold text-spotify-white">0</p>
              <p className="text-sm text-spotify-gray">Total Rounds</p>
            </CardContent>
          </Card>
          <Card variant="glow" className="text-center">
            <CardContent className="pt-6">
              <MusicalNoteIcon className="w-8 h-8 text-spotify-purple mx-auto mb-2" />
              <p className="text-2xl font-bold text-spotify-white">0%</p>
              <p className="text-sm text-spotify-gray">Win Rate</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid lg:grid-cols-2 gap-8"
        >
          {/* Create Game Card */}
          <Card variant="elevated" className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <PlusIcon className="w-6 h-6 text-spotify-green" />
                Create New Game
              </CardTitle>
              <CardDescription>
                Start a new lobby and invite your friends to guess your favorite tracks!
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <AnimatePresence mode="wait">
                {!showCreateForm ? (
                  <motion.div
                    key="quick-actions"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-3"
                  >
                    <Button
                      onClick={quickCreateLobby}
                      loading={isCreatingLobby}
                      className="w-full"
                      size="lg"
                      icon={<PlayIcon className="w-5 h-5" />}
                    >
                      Quick Create
                    </Button>
                    <p className="text-xs text-spotify-gray text-center">
                      8 players • 5 rounds • Songs • Last 4 weeks
                    </p>
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      variant="outline"
                      className="w-full"
                      icon={<Cog6ToothIcon className="w-4 h-4" />}
                    >
                      Custom Settings
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="create-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-spotify-white">Game Settings</h3>
                      <Button
                        onClick={() => setShowCreateForm(false)}
                        variant="ghost"
                        size="sm"
                        icon={<XMarkIcon className="w-4 h-4" />}
                      />
                    </div>

                    <Input
                      label="Lobby Name"
                      value={lobbyName}
                      onChange={(e) => setLobbyName(e.target.value)}
                      placeholder={`${session?.user?.name || 'Player'}'s Game`}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Max Players"
                        type="number"
                        min="2"
                        max="12"
                        value={maxPlayers.toString()}
                        onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                        icon={<UserGroupIcon className="w-4 h-4" />}
                      />
                      <Input
                        label="Rounds"
                        type="number"
                        min="1"
                        max="50"
                        value={roundCount.toString()}
                        onChange={(e) => setRoundCount(parseInt(e.target.value))}
                        icon={<ClockIcon className="w-4 h-4" />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-spotify-white mb-2">
                        Game Mode
                      </label>
                      <select
                        value={gameMode}
                        onChange={(e) => setGameMode(e.target.value as 'SONGS' | 'ARTISTS')}
                        className="input-primary"
                      >
                        <option value="SONGS">🎵 Guess Songs</option>
                        <option value="ARTISTS">👤 Guess Artists</option>
                      </select>
                      <p className="text-xs text-spotify-gray mt-1">
                        {gameMode === 'SONGS' ? 'Players guess who likes which songs' : 'Players guess who likes which artists'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-spotify-white mb-2">
                        Music Time Range
                      </label>
                      <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM')}
                        className="input-primary"
                      >
                        <option value="SHORT_TERM">📅 Last 4 weeks</option>
                        <option value="MEDIUM_TERM">📆 Last 6 months</option>
                        <option value="LONG_TERM">⏳ All time</option>
                      </select>
                      <p className="text-xs text-spotify-gray mt-1">
                        Time period for Spotify top {gameMode === 'SONGS' ? 'tracks' : 'artists'}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={createLobby}
                        loading={isCreatingLobby}
                        className="flex-1"
                      >
                        Create Lobby
                      </Button>
                      <Button
                        onClick={() => setShowCreateForm(false)}
                        variant="secondary"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Join Game Card */}
          <Card variant="elevated" className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <UserGroupIcon className="w-6 h-6 text-spotify-blue" />
                Join Game
              </CardTitle>
              <CardDescription>
                Have a game code? Join an existing lobby and start playing!
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-spotify-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ArrowRightIcon className="w-8 h-8 text-spotify-blue" />
                  </div>
                  <p className="text-spotify-gray mb-4">
                    Enter a 6-character game code to join
                  </p>
                </div>
                
                <Link href="/join">
                  <Button className="w-full" size="lg" variant="outline">
                    Join Lobby
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Games */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Games</CardTitle>
              <CardDescription>
                Your game history will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-spotify-gray/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MusicalNoteIcon className="w-8 h-8 text-spotify-gray" />
                </div>
                <p className="text-spotify-gray">
                  No recent games yet. Create your first lobby to get started!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="mt-16 border-t border-border backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-spotify-gray">Created by</span>
              <motion.a 
                href="https://github.com/OlszarAi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-spotify-green hover:text-spotify-green-hover transition-colors font-semibold"
                whileHover={{ scale: 1.05 }}
              >
                Adam Olszar
              </motion.a>
            </div>
            <div className="flex items-center space-x-4 text-sm text-spotify-gray">
              <motion.a 
                href="https://github.com/OlszarAi/spotigame" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-spotify-white transition-colors flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>View on GitHub</span>
              </motion.a>
              <span>•</span>
              <span>MIT License</span>
            </div>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  )
}
