import { useEffect, useState, useRef } from 'react'

interface AudioPlayerProps {
  src: string | null
  autoPlay?: boolean
  onPlay?: () => void
  onPause?: () => void
  onError?: (error: string) => void
  onReady?: () => void
}

export const useAudioPlayer = ({ 
  src, 
  autoPlay = false, 
  onPlay, 
  onPause, 
  onError, 
  onReady 
}: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canPlay, setCanPlay] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!src) {
      setError('No audio source provided')
      return
    }

    setIsLoading(true)
    setError(null)
    setCanPlay(false)

    const audio = new Audio()
    audioRef.current = audio

    // Set up event listeners
    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      setCanPlay(true)
      setError(null)
      onReady?.()
      
      if (autoPlay) {
        audio.play().catch(handleError)
      }
    }

    const handleError = (e?: Event) => {
      setIsLoading(false)
      setIsPlaying(false)
      setCanPlay(false)
      const errorMessage = 'Failed to load audio preview'
      setError(errorMessage)
      onError?.(errorMessage)
      console.error('Audio error:', e)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    // Add event listeners
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('ended', handleEnded)

    // Configure audio
    audio.volume = 0.7
    audio.preload = 'auto'
    
    // Set source and start loading
    audio.src = src

    // Cleanup function
    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('ended', handleEnded)
      
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [src, autoPlay, onPlay, onPause, onError, onReady])

  const play = async () => {
    if (!audioRef.current || !canPlay) return false

    try {
      await audioRef.current.play()
      return true
    } catch (error) {
      console.error('Error playing audio:', error)
      setError('Failed to play audio')
      onError?.('Failed to play audio')
      return false
    }
  }

  const pause = () => {
    if (!audioRef.current) return

    audioRef.current.pause()
  }

  const toggle = async () => {
    if (isPlaying) {
      pause()
    } else {
      await play()
    }
  }

  const setVolume = (volume: number) => {
    if (!audioRef.current) return

    audioRef.current.volume = Math.max(0, Math.min(1, volume))
  }

  return {
    isPlaying,
    isLoading,
    error,
    canPlay,
    play,
    pause,
    toggle,
    setVolume
  }
}
