import { Lobby, LobbySettings, Player, Track, GameState, RoundResult, PlayerScore } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export class LobbyManager {
  private lobbies: Map<string, Lobby> = new Map()

  createLobby(creatorId: string, creatorName: string, settings: LobbySettings): Lobby {
    const lobbyId = uuidv4()
    const lobby: Lobby = {
      id: lobbyId,
      creatorId,
      creatorName,
      settings,
      players: [{
        id: creatorId,
        name: creatorName,
        isReady: false,
        tracks: [],
        score: 0,
      }],
      status: 'waiting',
      createdAt: new Date(),
    }
    
    this.lobbies.set(lobbyId, lobby)
    return lobby
  }

  getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId)
  }

  joinLobby(lobbyId: string, playerId: string, playerName: string, playerImage?: string): Lobby | null {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || lobby.status !== 'waiting') {
      return null
    }

    // Check if player is already in lobby
    const existingPlayerIndex = lobby.players.findIndex(p => p.id === playerId)
    if (existingPlayerIndex >= 0) {
      return lobby // Player already in lobby
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      image: playerImage,
      isReady: false,
      tracks: [],
      score: 0,
    }

    lobby.players.push(newPlayer)
    this.lobbies.set(lobbyId, lobby)
    return lobby
  }

  leaveLobby(lobbyId: string, playerId: string): Lobby | null {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return null

    lobby.players = lobby.players.filter(p => p.id !== playerId)
    
    // If creator left and there are other players, make the first player the new creator
    if (lobby.creatorId === playerId && lobby.players.length > 0) {
      lobby.creatorId = lobby.players[0].id
      lobby.creatorName = lobby.players[0].name
    }

    // If no players left, delete the lobby
    if (lobby.players.length === 0) {
      this.lobbies.delete(lobbyId)
      return null
    }

    this.lobbies.set(lobbyId, lobby)
    return lobby
  }

  updateLobbySettings(lobbyId: string, creatorId: string, settings: LobbySettings): Lobby | null {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || lobby.creatorId !== creatorId || lobby.status !== 'waiting') {
      return null
    }

    lobby.settings = settings
    this.lobbies.set(lobbyId, lobby)
    return lobby
  }

  setPlayerTracks(lobbyId: string, playerId: string, tracks: Track[]): Lobby | null {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return null

    const playerIndex = lobby.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) return null

    lobby.players[playerIndex].tracks = tracks
    lobby.players[playerIndex].isReady = true

    // Check if all players are ready
    const allReady = lobby.players.every(p => p.isReady && p.tracks.length > 0)
    if (allReady && lobby.status === 'fetching-tracks') {
      lobby.status = 'playing'
      lobby.gameState = {
        currentRound: 1,
        playerGuesses: {},
      }
    }

    this.lobbies.set(lobbyId, lobby)
    return lobby
  }

  startGame(lobbyId: string, creatorId: string): Lobby | null {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || lobby.creatorId !== creatorId || lobby.status !== 'waiting') {
      return null
    }

    lobby.status = 'fetching-tracks'
    this.lobbies.set(lobbyId, lobby)
    return lobby
  }

  getAllTracks(lobbyId: string): Track[] {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return []

    const allTracks: Track[] = []
    lobby.players.forEach(player => {
      allTracks.push(...player.tracks)
    })

    return allTracks
  }

  getRandomTrack(lobbyId: string, excludeTrackIds: string[] = []): Track | null {
    const allTracks = this.getAllTracks(lobbyId)
    const availableTracks = allTracks.filter(track => !excludeTrackIds.includes(track.id))
    
    if (availableTracks.length === 0) return null
    
    const randomIndex = Math.floor(Math.random() * availableTracks.length)
    return availableTracks[randomIndex]
  }

  submitGuess(lobbyId: string, playerId: string, guessedUserId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || !lobby.gameState) return false

    lobby.gameState.playerGuesses[playerId] = guessedUserId
    this.lobbies.set(lobbyId, lobby)
    return true
  }

  processRoundResults(lobbyId: string): RoundResult[] | null {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || !lobby.gameState || !lobby.gameState.currentTrack) return null

    const results: RoundResult[] = []
    const correctUserId = lobby.gameState.currentTrack.ownerUserId

    Object.entries(lobby.gameState.playerGuesses).forEach(([playerId, guessedUserId]) => {
      const player = lobby.players.find(p => p.id === playerId)
      const guessedUser = lobby.players.find(p => p.id === guessedUserId)
      
      if (player && guessedUser) {
        const isCorrect = guessedUserId === correctUserId
        const points = isCorrect ? 1 : 0

        // Update player score
        player.score += points

        results.push({
          playerId,
          playerName: player.name,
          guessedUserId,
          guessedUserName: guessedUser.name,
          isCorrect,
          points,
        })
      }
    })

    // Reset guesses for next round
    lobby.gameState.playerGuesses = {}
    
    this.lobbies.set(lobbyId, lobby)
    return results
  }

  isGameFinished(lobbyId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || !lobby.gameState) return false

    return lobby.gameState.currentRound >= lobby.settings.numberOfRounds
  }

  getFinalResults(lobbyId: string): PlayerScore[] {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return []

    return lobby.players
      .map(player => ({
        playerId: player.id,
        playerName: player.name,
        score: player.score,
        correctGuesses: player.score, // Since each correct guess = 1 point
        totalRounds: lobby.settings.numberOfRounds,
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
  }

  nextRound(lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || !lobby.gameState) return

    lobby.gameState.currentRound++
    
    if (this.isGameFinished(lobbyId)) {
      lobby.status = 'finished'
      lobby.gameState.finalResults = this.getFinalResults(lobbyId)
    }

    this.lobbies.set(lobbyId, lobby)
  }

  deleteLobby(lobbyId: string): void {
    this.lobbies.delete(lobbyId)
  }

  // Clean up old lobbies (older than 24 hours)
  cleanupOldLobbies(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    for (const [lobbyId, lobby] of this.lobbies.entries()) {
      if (lobby.createdAt < oneDayAgo) {
        this.lobbies.delete(lobbyId)
      }
    }
  }
}

// Singleton instance
export const lobbyManager = new LobbyManager()

// Clean up old lobbies every hour
setInterval(() => {
  lobbyManager.cleanupOldLobbies()
}, 60 * 60 * 1000)
