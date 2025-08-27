export interface Database {
  public: {
    Tables: {
      lobbies: {
        Row: {
          id: string
          creator_id: string
          name: string
          settings: LobbySettings
          status: 'waiting' | 'starting' | 'in_progress' | 'finished'
          current_round: number
          max_players: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          name: string
          settings?: LobbySettings
          status?: 'waiting' | 'starting' | 'in_progress' | 'finished'
          current_round?: number
          max_players?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          name?: string
          settings?: LobbySettings
          status?: 'waiting' | 'starting' | 'in_progress' | 'finished'
          current_round?: number
          max_players?: number
          created_at?: string
          updated_at?: string
        }
      }
      lobby_players: {
        Row: {
          id: string
          lobby_id: string
          user_id: string
          username: string
          avatar_url: string | null
          joined_at: string
          is_ready: boolean
        }
        Insert: {
          id?: string
          lobby_id: string
          user_id: string
          username: string
          avatar_url?: string | null
          joined_at?: string
          is_ready?: boolean
        }
        Update: {
          id?: string
          lobby_id?: string
          user_id?: string
          username?: string
          avatar_url?: string | null
          joined_at?: string
          is_ready?: boolean
        }
      }
      game_sessions: {
        Row: {
          id: string
          lobby_id: string
          track_pool: GameTrack[]
          current_track: GameTrack | null
          round_number: number
          round_start_time: string | null
          round_end_time: string | null
          status: 'preparing' | 'playing' | 'voting' | 'results' | 'finished'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lobby_id: string
          track_pool?: GameTrack[]
          current_track?: GameTrack | null
          round_number?: number
          round_start_time?: string | null
          round_end_time?: string | null
          status?: 'preparing' | 'playing' | 'voting' | 'results' | 'finished'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lobby_id?: string
          track_pool?: GameTrack[]
          current_track?: GameTrack | null
          round_number?: number
          round_start_time?: string | null
          round_end_time?: string | null
          status?: 'preparing' | 'playing' | 'voting' | 'results' | 'finished'
          created_at?: string
          updated_at?: string
        }
      }
      player_scores: {
        Row: {
          id: string
          game_session_id: string
          user_id: string
          total_score: number
          round_scores: RoundScore[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_session_id: string
          user_id: string
          total_score?: number
          round_scores?: RoundScore[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_session_id?: string
          user_id?: string
          total_score?: number
          round_scores?: RoundScore[]
          created_at?: string
          updated_at?: string
        }
      }
      round_guesses: {
        Row: {
          id: string
          game_session_id: string
          user_id: string
          round_number: number
          guessed_user_id: string | null
          is_correct: boolean
          points_earned: number
          submitted_at: string
        }
        Insert: {
          id?: string
          game_session_id: string
          user_id: string
          round_number: number
          guessed_user_id?: string | null
          is_correct?: boolean
          points_earned?: number
          submitted_at?: string
        }
        Update: {
          id?: string
          game_session_id?: string
          user_id?: string
          round_number?: number
          guessed_user_id?: string | null
          is_correct?: boolean
          points_earned?: number
          submitted_at?: string
        }
      }
    }
  }
}

export interface LobbySettings {
  rounds: number
  snippet_duration: number
  show_track_info: boolean
}

export interface GameTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  preview_url: string
  external_urls: { spotify: string }
  album: {
    name: string
    images: Array<{ url: string; height?: number; width?: number }>
  }
  ownerId: string
  ownerName: string
}

export interface RoundScore {
  round: number
  points: number
  correct: boolean
}

export interface LobbyWithPlayers {
  id: string
  creator_id: string
  name: string
  settings: LobbySettings
  status: 'waiting' | 'starting' | 'in_progress' | 'finished'
  current_round: number
  max_players: number
  created_at: string
  updated_at: string
  lobby_players: LobbyPlayer[]
}

export interface LobbyPlayer {
  id: string
  lobby_id: string
  user_id: string
  username: string
  avatar_url: string | null
  joined_at: string
  is_ready: boolean
}

export interface GameSessionWithScores {
  id: string
  lobby_id: string
  track_pool: GameTrack[]
  current_track: GameTrack | null
  round_number: number
  round_start_time: string | null
  round_end_time: string | null
  status: 'preparing' | 'playing' | 'voting' | 'results' | 'finished'
  created_at: string
  updated_at: string
  scores: PlayerScore[]
}

export interface PlayerScore {
  id: string
  game_session_id: string
  user_id: string
  total_score: number
  round_scores: RoundScore[]
  created_at: string
  updated_at: string
}
