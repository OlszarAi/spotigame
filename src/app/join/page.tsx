'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ArrowLeftIcon, UserGroupIcon, HashtagIcon } from '@heroicons/react/24/outline'

export default function JoinLobby() {
  const { status } = useSession()
  const router = useRouter()
  const [gameCode, setGameCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  if (status === 'unauthenticated') {
    router.push('/')
    return null
  }

  const joinLobby = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameCode.trim()) return

    setIsJoining(true)
    setError('')

    try {
      const response = await fetch(`/api/lobbies/${gameCode.toLowerCase()}/join`, {
        method: 'POST',
      })

      if (response.ok) {
        router.push(`/lobby/${gameCode.toLowerCase()}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to join lobby')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length <= 8) {
      setGameCode(value)
      setError('') // Clear error when user types
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const cleanedText = pastedText.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setGameCode(cleanedText)
    setError('')
  }

  return (
    <div className="min-h-screen mobile-safe-area">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-spotify-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-spotify-purple/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-4 pt-8"
        >
          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            size="sm"
            icon={<ArrowLeftIcon className="w-4 h-4" />}
            className="mb-4"
          >
            Back to Dashboard
          </Button>
        </motion.header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="max-w-md w-full space-y-8"
          >
            {/* Title */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
                className="w-16 h-16 bg-spotify-blue/10 rounded-2xl flex items-center justify-center mx-auto"
              >
                <UserGroupIcon className="w-8 h-8 text-spotify-blue" />
              </motion.div>
              
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">Join Game</h1>
                <p className="text-spotify-gray-light text-lg">
                  Enter the game code to join a lobby
                </p>
              </div>
            </div>

            {/* Join Form */}
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <HashtagIcon className="w-5 h-5 text-spotify-green" />
                  Game Code
                </CardTitle>
                <CardDescription>
                  Ask your friend for their 8-character game code
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={joinLobby} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      value={gameCode}
                      onChange={handleCodeChange}
                      onPaste={handlePaste}
                      placeholder="ABCD1234"
                      className="text-center font-mono text-xl tracking-widest"
                      error={error}
                      icon={<HashtagIcon className="w-4 h-4" />}
                      maxLength={8}
                    />
                    
                    <div className="text-center">
                      <div className="flex justify-center items-center space-x-2 text-sm text-spotify-gray">
                        <div className="flex space-x-1">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-1 rounded-full transition-colors duration-200 ${
                                i < gameCode.length 
                                  ? 'bg-spotify-green' 
                                  : 'bg-spotify-gray-darker'
                              }`}
                            />
                          ))}
                        </div>
                        <span>{gameCode.length}/8</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    loading={isJoining}
                    disabled={gameCode.length !== 8}
                    className="w-full"
                    size="lg"
                  >
                    {isJoining ? 'Joining...' : 'Join Lobby'}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="bg-background-tertiary/50 text-center">
                <div className="w-full space-y-2">
                  <p className="text-xs text-spotify-gray">
                    Game codes are case-insensitive and expire after 24 hours
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-spotify-gray">
                    <span>🎵 Songs & Artists</span>
                    <span>•</span>
                    <span>👥 2-12 Players</span>
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* Help Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Card variant="glow" className="text-center">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-spotify-white mb-2">
                    Don't have a code?
                  </h3>
                  <p className="text-sm text-spotify-gray mb-4">
                    Ask your friend to create a game and share the code with you
                  </p>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="outline"
                    size="sm"
                  >
                    Create Your Own Game
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="border-t border-border backdrop-blur-sm p-4"
        >
          <div className="max-w-md mx-auto text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-spotify-gray text-xs">Created by</span>
              <motion.a 
                href="https://github.com/OlszarAi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-spotify-green hover:text-spotify-green-hover transition-colors font-semibold text-xs"
                whileHover={{ scale: 1.05 }}
              >
                Adam Olszar
              </motion.a>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}
