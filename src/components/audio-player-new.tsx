'use client'

import { Play, Pause, AlertCircle, Loader2 } from 'lucide-react'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'

interface AudioPlayerProps {
  src: string | null
  autoPlay?: boolean
  disabled?: boolean
  className?: string
}

export default function AudioPlayer({ 
  src, 
  autoPlay = false, 
  disabled = false,
  className = '' 
}: AudioPlayerProps) {
  const {
    isPlaying,
    isLoading,
    error,
    canPlay,
    toggle
  } = useAudioPlayer({
    src,
    autoPlay,
    onError: (error) => console.error('Audio player error:', error)
  })

  const getButtonContent = () => {
    if (isLoading) {
      return <Loader2 className="w-8 h-8 text-spotify-black animate-spin" />
    }
    
    if (error || !src) {
      return <AlertCircle className="w-8 h-8 text-red-500" />
    }
    
    if (isPlaying) {
      return <Pause className="w-8 h-8 text-spotify-black" />
    }
    
    return <Play className="w-8 h-8 text-spotify-black" />
  }

  const getStatusText = () => {
    if (isLoading) return 'Loading audio...'
    if (error) return 'Audio unavailable'
    if (!src) return 'No preview available'
    if (!canPlay) return 'Loading...'
    if (isPlaying) return 'Playing...'
    return 'Ready to play'
  }

  const getButtonClass = () => {
    let baseClass = 'p-4 rounded-full transition-colors shadow-lg '
    
    if (disabled || error || !src || !canPlay) {
      baseClass += 'bg-gray-600 cursor-not-allowed'
    } else {
      baseClass += 'bg-spotify-green hover:bg-spotify-dark-green'
    }
    
    return baseClass
  }

  return (
    <div className={`flex justify-center items-center gap-4 ${className}`}>
      <button
        onClick={toggle}
        disabled={disabled || !!error || !src || !canPlay || isLoading}
        className={getButtonClass()}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {getButtonContent()}
      </button>
      <div className="text-center">
        <p className="text-sm text-spotify-light-gray">
          {getStatusText()}
        </p>
        {error && (
          <p className="text-xs text-red-400 mt-1 max-w-48">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
