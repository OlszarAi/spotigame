import { Lobby, GameRound, PlayerScore } from '@/types/game'

class GameStore {
  private static instance: GameStore
  private lobbies = new Map<string, Lobby>()
  private gameRounds = new Map<string, GameRound[]>()
  private playerScores = new Map<string, PlayerScore[]>()

  static getInstance(): GameStore {
    if (!GameStore.instance) {
      GameStore.instance = new GameStore()
    }
    return GameStore.instance
  }

  // Lobby management
  createLobby(lobby: Lobby): void {
    this.lobbies.set(lobby.id, lobby)
    this.playerScores.set(lobby.id, [])
    this.gameRounds.set(lobby.id, [])
  }

  getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId)
  }

  updateLobby(lobbyId: string, updates: Partial<Lobby>): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    const updatedLobby = { ...lobby, ...updates }
    this.lobbies.set(lobbyId, updatedLobby)
    return true
  }

  deleteLobby(lobbyId: string): boolean {
    this.lobbies.delete(lobbyId)
    this.playerScores.delete(lobbyId)
    this.gameRounds.delete(lobbyId)
    return true
  }

  // Game rounds management
  addGameRound(lobbyId: string, round: GameRound): void {
    const rounds = this.gameRounds.get(lobbyId) || []
    rounds.push(round)
    this.gameRounds.set(lobbyId, rounds)
  }

  getGameRounds(lobbyId: string): GameRound[] {
    return this.gameRounds.get(lobbyId) || []
  }

  getCurrentRound(lobbyId: string): GameRound | undefined {
    const rounds = this.gameRounds.get(lobbyId) || []
    return rounds[rounds.length - 1]
  }

  // Player scores management
  initializeScores(lobbyId: string, playerIds: string[], playerNames: string[]): void {
    const scores: PlayerScore[] = playerIds.map((id, index) => ({
      userId: id,
      userName: playerNames[index] || id,
      score: 0
    }))
    this.playerScores.set(lobbyId, scores)
  }

  updatePlayerScore(lobbyId: string, userId: string, points: number): void {
    const scores = this.playerScores.get(lobbyId) || []
    const playerScore = scores.find(s => s.userId === userId)
    if (playerScore) {
      playerScore.score += points
    }
    this.playerScores.set(lobbyId, scores)
  }

  getPlayerScores(lobbyId: string): PlayerScore[] {
    return this.playerScores.get(lobbyId) || []
  }

  // Game logic helpers
  getRandomTrack(lobbyId: string, roundNumber: number): any {
    const lobby = this.getLobby(lobbyId)
    if (!lobby || lobby.tracks.length === 0) return null

    // Use round number as seed for consistent track selection
    const trackIndex = (roundNumber - 1) % lobby.tracks.length
    return lobby.tracks[trackIndex]
  }

  getTrackOwners(lobbyId: string): Array<{ id: string; name: string }> {
    const lobby = this.getLobby(lobbyId)
    if (!lobby || lobby.tracks.length === 0) return []

    const owners = new Map<string, string>()
    lobby.tracks.forEach(track => {
      owners.set(track.user_id, track.user_name)
    })

    return Array.from(owners.entries()).map(([id, name]) => ({ id, name }))
  }

  calculateRoundScore(lobbyId: string, userId: string, guessedUserId: string, correctUserId: string): number {
    if (guessedUserId === correctUserId) {
      return 10 // Base points for correct guess
    }
    return 0
  }

  // Cleanup old lobbies (call this periodically)
  cleanupOldLobbies(): void {
    const now = new Date()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const [lobbyId, lobby] of this.lobbies.entries()) {
      const age = now.getTime() - lobby.createdAt.getTime()
      if (age > maxAge) {
        this.deleteLobby(lobbyId)
      }
    }
  }
}

export default GameStore
