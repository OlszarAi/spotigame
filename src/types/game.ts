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
  user_id: string // Spotify user ID who has this as top track
  user_name: string // Display name of the user who has this as top track
}

export interface GameSettings {
  numberOfRounds: number
  roundDuration: number // in seconds
  tracksPerUser: number // how many tracks to take from each user's top tracks
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
  correctAnswer: string // user_id of the track owner
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
