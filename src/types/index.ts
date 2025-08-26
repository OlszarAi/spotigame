export interface User {
  id: string
  name: string
  email: string
  image?: string
  spotifyId: string
  accessToken: string
  refreshToken: string
}

export interface Track {
  id: string
  title: string
  artist: string
  previewUrl?: string
  ownerUserId: string
  ownerUserName: string
}

export interface Lobby {
  id: string
  creatorId: string
  creatorName: string
  settings: LobbySettings
  players: Player[]
  status: 'waiting' | 'fetching-tracks' | 'playing' | 'finished'
  gameState?: GameState
  createdAt: Date
}

export interface LobbySettings {
  numberOfRounds: number
  listeningDuration: number // in seconds
  showTrackInfo: boolean
}

export interface Player {
  id: string
  name: string
  image?: string
  isReady: boolean
  tracks: Track[]
  score: number
}

export interface GameState {
  currentRound: number
  currentTrack?: Track
  roundStartTime?: Date
  roundEndTime?: Date
  playerGuesses: Record<string, string> // playerId -> guessedUserId
  roundResults?: RoundResult[]
  finalResults?: PlayerScore[]
}

export interface RoundResult {
  playerId: string
  playerName: string
  guessedUserId: string
  guessedUserName: string
  isCorrect: boolean
  points: number
}

export interface PlayerScore {
  playerId: string
  playerName: string
  score: number
  correctGuesses: number
  totalRounds: number
}
