'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { pusherClient } from '@/lib/pusher'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  UserGroupIcon, 
  CogIcon, 
  CheckIcon, 
  XMarkIcon,
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  PlayIcon,
  UserIcon,
  MusicalNoteIcon,
  ClockIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

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
  code: string
  name: string
  hostId: string
  maxPlayers: number
  roundCount: number
  gameMode: string
  timeRange: string
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
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [tempMaxPlayers, setTempMaxPlayers] = useState(8)
  const [tempRoundCount, setTempRoundCount] = useState(5)
  const [tempGameMode, setTempGameMode] = useState<'SONGS' | 'ARTISTS'>('SONGS')
  const [tempTimeRange, setTempTimeRange] = useState<'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'>('SHORT_TERM')
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    if (status === 'loading') {
      return
    }

    const fetchLobby = async () => {
      try {
        const response = await fetch(`/api/lobbies/${params.id}`)
        
        if (response.ok) {
          const lobbyData = await response.json()
          setLobby(lobbyData)
          
          const currentMember = lobbyData.members.find(
            (member: LobbyMember) => member.user.id === session?.user?.id
          )
          setIsReady(currentMember?.isReady || false)
          
          setTempMaxPlayers(lobbyData.maxPlayers)
          setTempRoundCount(lobbyData.roundCount)
          setTempGameMode(lobbyData.gameMode)
          setTempTimeRange(lobbyData.timeRange)
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

    fetchLobby()
  }, [session, params.id, router, status])

  useEffect(() => {
    if (!lobby) return

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
    })

    channel.bind('lobby-settings-updated', (data: { lobby: Lobby }) => {
      setLobby(data.lobby)
      setTempMaxPlayers(data.lobby.maxPlayers)
      setTempRoundCount(data.lobby.roundCount)
      setTempGameMode(data.lobby.gameMode as 'SONGS' | 'ARTISTS')
      setTempTimeRange(data.lobby.timeRange as 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM')
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
  }, [lobby, router])

  const toggleReady = async () => {
    if (!lobby) return
    
    try {
      const response = await fetch(`/api/lobbies/${lobby.id}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isReady: !isReady
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsReady(data.isReady)
      }
    } catch (error) {
      console.error('Error toggling ready state:', error)
    }
  }

  const startGame = async () => {
    if (!lobby) return
    
    setGameStarting(true)
    try {
      const response = await fetch(`/api/lobbies/${lobby.id}/start`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/game/${data.gameId}`)
      } else {
        const errorData = await response.json()
        console.error('Failed to start game:', errorData.error)
        alert(errorData.error || 'Failed to start game')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Error starting game')
    } finally {
      setGameStarting(false)
    }
  }

  const leaveLobby = async () => {
    if (!lobby) return
    
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

  const updateLobbySettings = async () => {
    if (!lobby) return
    
    setIsUpdatingSettings(true)
    try {
      const response = await fetch(`/api/lobbies/${lobby.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxPlayers: tempMaxPlayers,
          roundCount: tempRoundCount,
          gameMode: tempGameMode,
          timeRange: tempTimeRange,
        }),
      })

      if (response.ok) {
        const updatedLobby = await response.json()
        setLobby(updatedLobby)
        setIsEditingSettings(false)
      } else {
        const errorData = await response.json()
        console.error('Failed to update lobby settings:', errorData.error)
        alert(errorData.error || 'Failed to update lobby settings')
      }
    } catch (error) {
      console.error('Error updating lobby settings:', error)
      alert('Error updating lobby settings')
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  const handleEditSettings = () => {
    if (lobby) {
      setTempMaxPlayers(lobby.maxPlayers)
      setTempRoundCount(lobby.roundCount)
      setTempGameMode(lobby.gameMode as 'SONGS' | 'ARTISTS')
      setTempTimeRange(lobby.timeRange as 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM')
      setIsEditingSettings(true)
    }
  }

  const cancelEditSettings = () => {
    setIsEditingSettings(false)
    if (lobby) {
      setTempMaxPlayers(lobby.maxPlayers)
      setTempRoundCount(lobby.roundCount)
      setTempGameMode(lobby.gameMode as 'SONGS' | 'ARTISTS')
      setTempTimeRange(lobby.timeRange as 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM')
    }
  }

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(lobby?.code || '')
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }, [lobby?.code])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" text="Loading lobby..." />
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center mobile-safe-area">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 bg-spotify-red/10 rounded-2xl flex items-center justify-center mx-auto">
            <XMarkIcon className="w-8 h-8 text-spotify-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-spotify-red mb-2">Lobby not found</h1>
            <p className="text-spotify-gray">This lobby may have been deleted or the code is incorrect.</p>
          </div>
          <Button onClick={() => router.push('/dashboard')} size="lg">
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    )
  }

  const isHost = lobby.hostId === session?.user?.id
  const allReady = lobby.members.every(member => member.isReady)
  const canStart = isHost && lobby.members.length >= 2 && allReady

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen mobile-safe-area"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
                icon={<ArrowLeftIcon className="w-4 h-4" />}
                className="sm:hidden"
              />
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">{lobby.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-spotify-gray">
              <span className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                Host: {lobby.host.name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <UserGroupIcon className="w-4 h-4" />
                {lobby.members.length}/{lobby.maxPlayers} players
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              size="sm"
              icon={<ArrowLeftIcon className="w-4 h-4" />}
              className="hidden sm:flex"
            >
              Back
            </Button>
            {isHost && (
              <Button
                onClick={handleEditSettings}
                variant="secondary"
                size="sm"
                icon={<Cog6ToothIcon className="w-4 h-4" />}
              >
                Settings
              </Button>
            )}
          </div>
        </motion.header>

        {/* Game Info & Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Game Code */}
          <Card variant="elevated" className="lg:col-span-1">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <LinkIcon className="w-5 h-5 text-spotify-green" />
                Game Code
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="bg-background-tertiary rounded-xl p-4">
                  <code className="text-2xl font-mono tracking-widest text-spotify-green font-bold">
                    {lobby.code}
                  </code>
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  icon={<ClipboardDocumentIcon className="w-4 h-4" />}
                  className="w-full"
                >
                  Copy Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Game Settings */}
          <Card variant="glow" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5 text-spotify-blue" />
                Game Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {!isEditingSettings ? (
                  <motion.div
                    key="settings-display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-xl">
                      {lobby.gameMode === 'ARTISTS' ? (
                        <UserIcon className="w-6 h-6 text-spotify-purple" />
                      ) : (
                        <MusicalNoteIcon className="w-6 h-6 text-spotify-green" />
                      )}
                      <div>
                        <p className="font-medium text-spotify-white">
                          {lobby.gameMode === 'ARTISTS' ? 'Artist Mode' : 'Song Mode'}
                        </p>
                        <p className="text-xs text-spotify-gray">Game Type</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-xl">
                      <ClockIcon className="w-6 h-6 text-spotify-orange" />
                      <div>
                        <p className="font-medium text-spotify-white">
                          {lobby.timeRange === 'SHORT_TERM' ? 'Last 4 weeks' : 
                           lobby.timeRange === 'MEDIUM_TERM' ? 'Last 6 months' : 'All time'}
                        </p>
                        <p className="text-xs text-spotify-gray">Time Range</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-xl">
                      <PlayIcon className="w-6 h-6 text-spotify-blue" />
                      <div>
                        <p className="font-medium text-spotify-white">{lobby.roundCount} rounds</p>
                        <p className="text-xs text-spotify-gray">Game Length</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="settings-edit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Max Players"
                        type="number"
                        min="2"
                        max="12"
                        value={tempMaxPlayers.toString()}
                        onChange={(e) => setTempMaxPlayers(parseInt(e.target.value))}
                        icon={<UserGroupIcon className="w-4 h-4" />}
                      />
                      <Input
                        label="Rounds"
                        type="number"
                        min="1"
                        max="50"
                        value={tempRoundCount.toString()}
                        onChange={(e) => setTempRoundCount(parseInt(e.target.value))}
                        icon={<ClockIcon className="w-4 h-4" />}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-spotify-white mb-2">
                          Game Mode
                        </label>
                        <select
                          value={tempGameMode}
                          onChange={(e) => setTempGameMode(e.target.value as 'SONGS' | 'ARTISTS')}
                          className="input-primary"
                        >
                          <option value="SONGS">🎵 Guess Songs</option>
                          <option value="ARTISTS">👤 Guess Artists</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-spotify-white mb-2">
                          Time Range
                        </label>
                        <select
                          value={tempTimeRange}
                          onChange={(e) => setTempTimeRange(e.target.value as 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM')}
                          className="input-primary"
                        >
                          <option value="SHORT_TERM">📅 Last 4 weeks</option>
                          <option value="MEDIUM_TERM">📆 Last 6 months</option>
                          <option value="LONG_TERM">⏳ All time</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={updateLobbySettings}
                        loading={isUpdatingSettings}
                        icon={<CheckIcon className="w-4 h-4" />}
                        className="flex-1"
                      >
                        Save Changes
                      </Button>
                      <Button
                        onClick={cancelEditSettings}
                        variant="secondary"
                        icon={<XMarkIcon className="w-4 h-4" />}
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
        </motion.div>

        {/* Game Starting State */}
        <AnimatePresence>
          {gameStarting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="glow" className="border-spotify-green bg-spotify-green/5">
                <CardContent className="text-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 mx-auto mb-4"
                  >
                    <ArrowPathIcon className="w-12 h-12 text-spotify-green" />
                  </motion.div>
                  <h2 className="text-xl font-semibold text-spotify-green mb-2">Game Starting!</h2>
                  <p className="text-spotify-gray">Please wait while we prepare your tracks...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Players and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid lg:grid-cols-3 gap-6"
        >
          {/* Players List */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-spotify-green" />
                  Players ({lobby.members.length}/{lobby.maxPlayers})
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-spotify-gray">
                    {lobby.members.filter(m => m.isReady).length} ready
                  </span>
                  {allReady && lobby.members.length >= 2 && (
                    <CheckCircleIcon className="w-4 h-4 text-spotify-green" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <AnimatePresence>
                  {lobby.members.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-background-tertiary rounded-xl hover:bg-background-tertiary/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {member.user.image ? (
                            <img 
                              src={member.user.image} 
                              alt={member.user.name} 
                              className="w-10 h-10 rounded-full border-2 border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-spotify-gray/20 flex items-center justify-center border-2 border-border">
                              <UserIcon className="w-5 h-5 text-spotify-gray" />
                            </div>
                          )}
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background-tertiary ${
                            member.isReady ? 'bg-spotify-green' : 'bg-spotify-gray'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-spotify-white">{member.user.name}</p>
                          <div className="flex items-center gap-2 text-sm">
                            {member.userId === lobby.hostId && (
                              <span className="text-spotify-green font-medium">Host</span>
                            )}
                            {member.userId === lobby.hostId && member.userId !== session?.user?.id && (
                              <span className="text-spotify-gray">•</span>
                            )}
                            {member.userId === session?.user?.id && (
                              <span className="text-spotify-blue font-medium">You</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                          member.isReady 
                            ? 'bg-spotify-green/20 text-spotify-green border border-spotify-green/30' 
                            : 'bg-spotify-gray/20 text-spotify-gray border border-spotify-gray/30'
                        }`}
                      >
                        {member.isReady ? (
                          <>
                            <CheckCircleIcon className="w-4 h-4" />
                            Ready
                          </>
                        ) : (
                          <>
                            <ClockIcon className="w-4 h-4" />
                            Waiting
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              
              {lobby.members.length < lobby.maxPlayers && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 p-4 border-2 border-dashed border-border rounded-xl text-center"
                >
                  <UserGroupIcon className="w-8 h-8 text-spotify-gray mx-auto mb-2" />
                  <p className="text-sm text-spotify-gray">
                    Waiting for {lobby.maxPlayers - lobby.members.length} more player{lobby.maxPlayers - lobby.members.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-spotify-gray mt-1">
                    Share the game code with your friends!
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Game Controls */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayIcon className="w-5 h-5 text-spotify-blue" />
                Game Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={toggleReady}
                    disabled={gameStarting}
                    variant={isReady ? "danger" : "primary"}
                    size="lg"
                    className="w-full"
                    icon={isReady ? <XMarkIcon className="w-5 h-5" /> : <CheckIcon className="w-5 h-5" />}
                  >
                    {isReady ? 'Not Ready' : 'Mark as Ready'}
                  </Button>
                </motion.div>

                {isHost && (
                  <motion.div
                    whileHover={{ scale: canStart ? 1.02 : 1 }}
                    whileTap={{ scale: canStart ? 0.98 : 1 }}
                  >
                    <Button
                      onClick={startGame}
                      disabled={!canStart || gameStarting}
                      loading={gameStarting}
                      size="lg"
                      className="w-full"
                      icon={<PlayIcon className="w-5 h-5" />}
                    >
                      Start Game
                    </Button>
                  </motion.div>
                )}

                <AnimatePresence>
                  {!canStart && isHost && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-spotify-orange/10 border border-spotify-orange/30 rounded-xl p-3 text-center"
                    >
                      <p className="text-sm text-spotify-orange font-medium">
                        {lobby.members.length < 2 
                          ? '⚠️ Need at least 2 players to start'
                          : '⏳ Waiting for all players to be ready'
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-background-tertiary rounded-xl p-4 space-y-2"
                >
                  <h4 className="font-medium text-spotify-white mb-2">Game Rules</h4>
                  <div className="space-y-1 text-sm text-spotify-gray">
                    <p>• Guess which player likes each {lobby.gameMode === 'SONGS' ? 'song' : 'artist'}</p>
                    <p>• Each correct guess earns points</p>
                    <p>• Player with most points wins!</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={leaveLobby}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    icon={<ArrowLeftIcon className="w-4 h-4" />}
                  >
                    Leave Lobby
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
