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
  const [authStatus, setAuthStatus] = useState<Record<string, boolean>>({})

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

  // Fetch auth status for all players
  const fetchAuthStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/player-auth?lobbyId=${lobbyId}`)
      const data = await response.json()

      if (response.ok) {
        setAuthStatus(data.authStatus || {})
      }
    } catch (error) {
      console.error('Error fetching auth status:', error)
    }
  }, [lobbyId])

  // Subscribe to real-time updates
  useEffect(() => {
    fetchLobby()
    fetchAuthStatus()

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

    return () => {
      socket.unsubscribeLobby(lobbyId, handleLobbyUpdate)
    }
  }, [lobbyId, fetchLobby, fetchAuthStatus, currentTrack])

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

  const startGame = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, action: 'start' }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('🎮 Game started successfully')
        fetchLobby()
        return data
      } else {
        throw new Error(data.error || 'Failed to start game')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      throw error
    }
  }

  const loadCurrentTrack = async () => {
    try {
      const response = await fetch(`/api/game?lobbyId=${lobbyId}&action=currentTrack`)
      const data = await response.json()

      if (response.ok) {
        setCurrentTrack(data.track)
        // Set game options to all players in the lobby for multiplayer
        if (lobby?.players) {
          const playerOptions = lobby.players.map(player => ({
            id: player.id,
            name: player.name
          }))
          setGameOptions(playerOptions)
        } else {
          setGameOptions(data.options || [])
        }
        setRoundInfo(data.roundInfo)
        setTimeLeft(data.timeLeft)
      }
    } catch (error) {
      console.error('Error loading current track:', error)
    }
  }

  const submitGuess = async (guess: string) => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, action: 'guess', guess }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setScores(data.scores || [])
        return data
      } else {
        throw new Error(data.error || 'Failed to submit guess')
      }
    } catch (error) {
      console.error('Error submitting guess:', error)
      throw error
    }
  }

  const nextRound = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, action: 'nextRound' }),
      })

      if (response.ok) {
        setCurrentTrack(null)
        setGameOptions([])
        loadCurrentTrack()
      }
    } catch (error) {
      console.error('Error going to next round:', error)
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

  // Multiplayer authorization functions
  const authorizePlayer = async () => {
    try {
      const response = await fetch('/api/player-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId }),
      })

      if (response.ok) {
        await fetchAuthStatus()
        return true
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to authorize player')
      }
    } catch (error) {
      console.error('Error authorizing player:', error)
      throw error
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
    authStatus,
    joinLobby,
    startGame,
    loadCurrentTrack,
    submitGuess,
    nextRound,
    loadLeaderboard,
    fetchLobby,
    authorizePlayer,
    fetchAuthStatus
  }
}
