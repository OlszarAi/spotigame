-- COMPLETE DATABASE RESET AND RECREATION
-- This script will drop all tables and recreate them from scratch

-- Step 1: Drop all existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS round_guesses CASCADE;
DROP TABLE IF EXISTS player_scores CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS lobby_players CASCADE;
DROP TABLE IF EXISTS lobbies CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 3: Create NextAuth tables first (since our game tables will reference them)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, "providerAccountId")
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (identifier, token)
);

-- Step 4: Create game tables with proper references to users table
CREATE TABLE lobbies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE lobby_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_ready BOOLEAN DEFAULT FALSE,
  UNIQUE(lobby_id, user_id)
);

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

CREATE TABLE player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  round_scores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_session_id, user_id)
);

CREATE TABLE round_guesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  guessed_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_session_id, user_id, round_number)
);

-- Step 5: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_guesses ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies (permissive for now - can be tightened later)
-- NextAuth tables - allow all for service role
CREATE POLICY "Allow all for service role" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON verification_tokens FOR ALL USING (true);

-- Game tables - allow all for now (can be refined later)
CREATE POLICY "Anyone can view lobbies" ON lobbies FOR SELECT USING (true);
CREATE POLICY "Users can create lobbies" ON lobbies FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update lobbies" ON lobbies FOR UPDATE USING (true);
CREATE POLICY "Users can delete lobbies" ON lobbies FOR DELETE USING (true);

CREATE POLICY "Anyone can view lobby players" ON lobby_players FOR SELECT USING (true);
CREATE POLICY "Users can join lobbies" ON lobby_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update lobby status" ON lobby_players FOR UPDATE USING (true);
CREATE POLICY "Users can leave lobbies" ON lobby_players FOR DELETE USING (true);

CREATE POLICY "Anyone can view game sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "System can manage game sessions" ON game_sessions FOR ALL USING (true);

CREATE POLICY "Anyone can view player scores" ON player_scores FOR SELECT USING (true);
CREATE POLICY "System can manage player scores" ON player_scores FOR ALL USING (true);

CREATE POLICY "Users can view round guesses" ON round_guesses FOR SELECT USING (true);
CREATE POLICY "Users can submit guesses" ON round_guesses FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update guesses" ON round_guesses FOR UPDATE USING (true);

-- Step 7: Create functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verification_tokens_updated_at BEFORE UPDATE ON verification_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lobbies_updated_at BEFORE UPDATE ON lobbies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_scores_updated_at BEFORE UPDATE ON player_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create indexes for performance
-- NextAuth indexes
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts("userId");
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions("userId");
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions("sessionToken");

-- Game indexes
CREATE INDEX idx_lobbies_status ON lobbies(status);
CREATE INDEX idx_lobbies_creator ON lobbies(creator_id);
CREATE INDEX idx_lobby_players_lobby ON lobby_players(lobby_id);
CREATE INDEX idx_lobby_players_user ON lobby_players(user_id);
CREATE INDEX idx_game_sessions_lobby ON game_sessions(lobby_id);
CREATE INDEX idx_player_scores_game ON player_scores(game_session_id);
CREATE INDEX idx_player_scores_user ON player_scores(user_id);
CREATE INDEX idx_round_guesses_game_round ON round_guesses(game_session_id, round_number);
CREATE INDEX idx_round_guesses_user ON round_guesses(user_id);

-- Success message
SELECT 'Database successfully reset and recreated!' as message;
