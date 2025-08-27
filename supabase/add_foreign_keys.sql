-- Second migration: Add foreign key constraints after NextAuth creates users table
-- Run this AFTER NextAuth creates the users table (after first successful login)

-- Add foreign key constraints to users table
ALTER TABLE lobbies 
ADD CONSTRAINT fk_lobbies_creator 
FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE lobby_players 
ADD CONSTRAINT fk_lobby_players_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE player_scores 
ADD CONSTRAINT fk_player_scores_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE round_guesses 
ADD CONSTRAINT fk_round_guesses_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE round_guesses 
ADD CONSTRAINT fk_round_guesses_guessed_user 
FOREIGN KEY (guessed_user_id) REFERENCES users(id) ON DELETE SET NULL;
