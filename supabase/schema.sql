-- Supabase database schema for SpotiGame

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (NextAuth will create this, but we'll extend it)
-- The NextAuth adapter will create: users, accounts, sessions, verification_tokens

-- Lobbies table
CREATE TABLE lobbies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "rounds": 10,
    "snippet_duration": 30,
    "show_track_info": false
  }'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'in_progress', 'finished')),
  current_round INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lobby players table
CREATE TABLE lobby_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_ready BOOLEAN DEFAULT FALSE,
  UNIQUE(lobby_id, user_id)
);

-- Game sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
  track_pool JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_track JSONB,
  round_number INTEGER DEFAULT 1,
  round_start_time TIMESTAMP WITH TIME ZONE,
  round_end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'playing', 'voting', 'results', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player scores table
CREATE TABLE player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  round_scores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_session_id, user_id)
);

-- Round guesses table
CREATE TABLE round_guesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  guessed_user_id UUID REFERENCES auth.users(id),
  is_correct BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_session_id, user_id, round_number)
);

-- Enable Row Level Security
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_guesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Lobbies: Anyone can read, only creator can update
CREATE POLICY "Anyone can view lobbies" ON lobbies FOR SELECT USING (true);
CREATE POLICY "Creator can update lobby" ON lobbies FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Authenticated users can create lobbies" ON lobbies FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Lobby players: Anyone can read, users can join/leave
CREATE POLICY "Anyone can view lobby players" ON lobby_players FOR SELECT USING (true);
CREATE POLICY "Users can join lobbies" ON lobby_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their lobby status" ON lobby_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave lobbies" ON lobby_players FOR DELETE USING (auth.uid() = user_id);

-- Game sessions: Anyone can read
CREATE POLICY "Anyone can view game sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "System can manage game sessions" ON game_sessions FOR ALL USING (true);

-- Player scores: Anyone can read
CREATE POLICY "Anyone can view player scores" ON player_scores FOR SELECT USING (true);
CREATE POLICY "System can manage player scores" ON player_scores FOR ALL USING (true);

-- Round guesses: Users can only see and manage their own guesses
CREATE POLICY "Users can view all round guesses" ON round_guesses FOR SELECT USING (true);
CREATE POLICY "Users can submit their own guesses" ON round_guesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own guesses" ON round_guesses FOR UPDATE USING (auth.uid() = user_id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_lobbies_updated_at BEFORE UPDATE ON lobbies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_scores_updated_at BEFORE UPDATE ON player_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_lobbies_status ON lobbies(status);
CREATE INDEX idx_lobbies_creator ON lobbies(creator_id);
CREATE INDEX idx_lobby_players_lobby ON lobby_players(lobby_id);
CREATE INDEX idx_lobby_players_user ON lobby_players(user_id);
CREATE INDEX idx_game_sessions_lobby ON game_sessions(lobby_id);
CREATE INDEX idx_player_scores_game ON player_scores(game_session_id);
CREATE INDEX idx_round_guesses_game_round ON round_guesses(game_session_id, round_number);
