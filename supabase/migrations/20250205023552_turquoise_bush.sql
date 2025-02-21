-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own load sessions" ON load_sessions;
DROP POLICY IF EXISTS "Users can view their own load sessions" ON load_sessions;
DROP POLICY IF EXISTS "Users can update their own load sessions" ON load_sessions;
DROP POLICY IF EXISTS "Users can delete their own load sessions" ON load_sessions;

-- Disable RLS
ALTER TABLE load_sessions DISABLE ROW LEVEL SECURITY;

-- Make user_id nullable and remove foreign key constraint
ALTER TABLE load_sessions DROP CONSTRAINT IF EXISTS load_sessions_user_id_fkey;
ALTER TABLE load_sessions ALTER COLUMN user_id DROP NOT NULL;