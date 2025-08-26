export interface User {
  id: string
  name: string
  email: string
  image?: string
  spotifyId: string
}

export interface Track {
  id: string
  name: string
  artist: string
  preview_url: string | null
  added_by: string // Spotify user ID who added the track
  added_by_name: string // Display name of the user who added the track
}

export interface GameSettings {
  numberOfRounds: number
  roundDuration: number // in seconds
  playlistUrl: string
}

export interface Lobby {
  id: string
  ownerId: string
  ownerName: string
  settings: GameSettings
  players: User[]
  status: 'waiting' | 'playing' | 'finished'
  currentRound: number
  tracks: Track[]
  createdAt: Date
}

export interface GameRound {
  roundNumber: number
  track: Track
  correctAnswer: string
  playerGuesses: Record<string, string> // userId -> guessed userId
  startTime: Date
  endTime?: Date
}

export interface PlayerScore {
  userId: string
  userName: string
  score: number
}

export interface GameState {
  lobby: Lobby
  currentRound?: GameRound
  scores: PlayerScore[]
  isGameActive: boolean
}
