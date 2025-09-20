'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PlayIcon, MusicalNoteIcon, UserGroupIcon, TrophyIcon } from '@heroicons/react/24/outline'

const SpotifyIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.481.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
)

const features = [
  {
    icon: MusicalNoteIcon,
    title: "Your Music",
    description: "Play with your actual Spotify listening history"
  },
  {
    icon: UserGroupIcon,
    title: "With Friends",
    description: "Invite up to 12 friends to join the fun"
  },
  {
    icon: TrophyIcon,
    title: "Compete",
    description: "See who knows their friends' taste the best"
  }
]

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" text="Loading SpotiGame..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-spotify-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-spotify-purple/5 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-spotify-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            {/* Logo and Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="inline-block"
              >
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold gradient-text mb-4">
                  SpotiGame
                </h1>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-lg sm:text-xl lg:text-2xl text-spotify-gray-light max-w-2xl mx-auto"
              >
                Guess your friends&apos; favorite Spotify tracks and discover who really knows each other&apos;s music taste
              </motion.p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                  className="card-glow p-6 text-center"
                >
                  <feature.icon className="w-8 h-8 text-spotify-green mx-auto mb-3" />
                  <h3 className="font-semibold text-spotify-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-spotify-gray">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
            
            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="space-y-6"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => signIn('spotify')}
                  size="lg"
                  className="text-lg px-8 py-4 shadow-spotify-hover"
                  icon={<SpotifyIcon />}
                  iconPosition="left"
                >
                  Login with Spotify
                </Button>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="text-sm text-spotify-gray max-w-md mx-auto"
              >
                Connect your Spotify account to access your listening history and create personalized games with friends
              </motion.p>
            </motion.div>

            {/* Demo Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="max-w-2xl mx-auto"
            >
              <div className="card-glow p-6 space-y-4">
                <div className="flex items-center justify-center space-x-2 text-spotify-green">
                  <PlayIcon className="w-5 h-5" />
                  <span className="font-medium">How it works</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto">1</div>
                    <p className="text-spotify-gray">Create a lobby with custom settings</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto">2</div>
                    <p className="text-spotify-gray">Invite friends to join your game</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto">3</div>
                    <p className="text-spotify-gray">Guess who likes which songs</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="border-t border-border backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto px-4 py-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-spotify-gray text-sm">Created by</span>
                <motion.a 
                  href="https://github.com/OlszarAi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-spotify-green hover:text-spotify-green-hover transition-colors font-semibold text-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  Adam Olszar
                </motion.a>
              </div>
              <div className="flex items-center space-x-4 text-xs text-spotify-gray">
                <motion.a 
                  href="https://github.com/OlszarAi/spotigame" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-spotify-white transition-colors flex items-center space-x-1"
                  whileHover={{ scale: 1.05 }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </motion.a>
                <span>•</span>
                <span>MIT License</span>
              </div>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}
