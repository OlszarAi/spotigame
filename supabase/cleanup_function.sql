-- Function to cleanup empty lobbies
CREATE OR REPLACE FUNCTION cleanup_empty_lobbies()
RETURNS void AS $$
BEGIN
  DELETE FROM lobbies 
  WHERE id IN (
    SELECT l.id 
    FROM lobbies l
    LEFT JOIN lobby_players lp ON l.id = lp.lobby_id
    WHERE lp.lobby_id IS NULL 
    AND l.created_at < NOW() - INTERVAL '30 seconds'
    AND l.status = 'waiting'
  );
END;
$$ LANGUAGE plpgsql;
