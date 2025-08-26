'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lobby, Track } from '@/types/game'
import { GameSocket } from '@/lib/socket'

export function useGameState(lobbyId: string) {
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [gameOptions, setGameOptions] = useState<Array<{ id: string; name: string }>>([])
  const [roundInfo, setRoundInfo] = useState({ current: 0, total: 0 })
  const [timeLeft, setTimeLeft] = useState(0)
  const [scores, setScores] = useState<Array<{ userId: string; userName: string; score: number }>>([])

  const socket = GameSocket.getInstance()

  // Fetch initial lobby data
  const fetchLobby = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobby?id=${lobbyId}`)
      const data = await response.json()

      if (response.ok) {
        setLobby(data.lobby)
      } else {
        setError(data.error || 'Failed to fetch lobby')
      }
    } catch (error) {
      console.error('Error fetching lobby:', error)
      setError('Failed to fetch lobby')
    } finally {
      setLoading(false)
    }
  }, [lobbyId])

  // Subscribe to real-time updates
  useEffect(() => {
    const handleLobbyUpdate = (updatedLobby: Lobby) => {
      setLobby(updatedLobby)
      
      // If game is playing, load current track
      if (updatedLobby.status === 'playing' && !currentTrack) {
        loadCurrentTrack()
      }
      
      // If game finished, load leaderboard
      if (updatedLobby.status === 'finished') {
        loadLeaderboard()
      }
    }

    socket.subscribeLobby(lobbyId, handleLobbyUpdate)
    fetchLobby()

    return () => {
      socket.unsubscribeLobby(lobbyId, handleLobbyUpdate)
    }
  }, [lobbyId, fetchLobby, currentTrack])

  const joinLobby = async () => {
    try {
      const response = await fetch('/api/lobby', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, action: 'join' }),
      })
      
      if (response.ok) {
        fetchLobby()
      }
    } catch (error) {
      console.error('Error joining lobby:', error)
    }
  }

  const loadPlaylist = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, action: 'load-playlist' }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error)
      }

      return data
    } catch (error) {
      throw error
    }
  }

  const startGame = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, action: 'start' }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error)
      }

      fetchLobby()
    } catch (error) {
      throw error
    }
  }

  const loadCurrentTrack = async () => {
    try {
      const response = await fetch(`/api/game?lobbyId=${lobbyId}&action=current-track`)
      const data = await response.json()

      if (response.ok) {
        setCurrentTrack(data.track)
        setGameOptions(data.options)
        setRoundInfo({ current: data.roundNumber, total: data.totalRounds })
        setTimeLeft(lobby?.settings.roundDuration || 30)
        return data
      }
    } catch (error) {
      console.error('Error loading current track:', error)
    }
  }

  const submitGuess = async (guessedUserId: string) => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId,
          action: 'submit-guess',
          data: {
            guessedUserId,
            roundNumber: roundInfo.current
          }
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error)
      }

      return data
    } catch (error) {
      throw error
    }
  }

  const nextRound = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, action: 'next-round' }),
      })

      const data = await response.json()
      if (response.ok) {
        if (data.isFinished) {
          loadLeaderboard()
        } else {
          loadCurrentTrack()
        }
      }
    } catch (error) {
      console.error('Error advancing round:', error)
    }
  }

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`/api/game?lobbyId=${lobbyId}&action=leaderboard`)
      const data = await response.json()

      if (response.ok) {
        setScores(data.scores)
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    }
  }

  return {
    lobby,
    loading,
    error,
    currentTrack,
    gameOptions,
    roundInfo,
    timeLeft,
    setTimeLeft,
    scores,
    joinLobby,
    loadPlaylist,
    startGame,
    loadCurrentTrack,
    submitGuess,
    nextRound,
    loadLeaderboard,
    fetchLobby
  }
}
