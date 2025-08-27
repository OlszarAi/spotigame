'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface AudioPlayerProps {
  previewUrl: string | null
  duration?: number // in seconds
  autoPlay?: boolean
  onEnd?: () => void
  showControls?: boolean
}

export function AudioPlayer({ 
  previewUrl, 
  duration = 30, 
  autoPlay = false, 
  onEnd, 
  showControls = true 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const audioRef = useRef<HTMLAudioElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !previewUrl) return

    try {
      await audio.play()
      setIsPlaying(true)
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }, [previewUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !previewUrl) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      onEnd?.()
    }

    const handleCanPlay = () => {
      if (autoPlay) {
        play()
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)
    audio.volume = volume

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [previewUrl, autoPlay, onEnd, volume, play])

  useEffect(() => {
    // Auto-stop after duration
    if (isPlaying && duration > 0) {
      intervalRef.current = setTimeout(() => {
        stop()
        onEnd?.()
      }, duration * 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [isPlaying, duration, onEnd])

  const pause = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setIsPlaying(false)
  }

  const stop = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!previewUrl) {
    return (
      <div className="bg-spotify-dark-gray rounded-lg p-4 text-center">
        <p className="text-spotify-light-gray">No preview available</p>
      </div>
    )
  }

  return (
    <div className="bg-spotify-dark-gray rounded-lg p-4 border border-spotify-gray">
      <audio ref={audioRef} src={previewUrl} preload="metadata" />
      
      {showControls && (
        <div className="space-y-4">
          {/* Play/Pause Button and Progress */}
          <div className="flex items-center space-x-4">
            <button
              onClick={isPlaying ? pause : play}
              className="bg-spotify-green hover:bg-spotify-dark-green p-3 rounded-full transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-spotify-black" />
              ) : (
                <Play className="w-6 h-6 text-spotify-black ml-1" />
              )}
            </button>
            
            <div className="flex-1">
              {/* Progress Bar */}
              <div className="bg-spotify-gray rounded-full h-2 relative">
                <div 
                  className="bg-spotify-green rounded-full h-2 transition-all duration-100"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {/* Time Display */}
              <div className="flex justify-between text-xs text-spotify-light-gray mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-spotify-light-gray" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 bg-spotify-gray rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      )}

      {!showControls && (
        <div className="flex items-center justify-center py-2">
          <button
            onClick={isPlaying ? pause : play}
            className="bg-spotify-green hover:bg-spotify-dark-green p-2 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-spotify-black" />
            ) : (
              <Play className="w-4 h-4 text-spotify-black ml-0.5" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// CSS for custom slider styling
export const audioPlayerStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: #1DB954;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: #1DB954;
    cursor: pointer;
    border: none;
  }
`
