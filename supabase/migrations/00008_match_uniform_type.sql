-- Add uniform_type column to matches table
-- Tracks which uniform (HOME/AWAY) the team wears for each match
ALTER TABLE matches ADD COLUMN IF NOT EXISTS uniform_type text NOT NULL DEFAULT 'HOME'
  CHECK (uniform_type IN ('HOME', 'AWAY'));
