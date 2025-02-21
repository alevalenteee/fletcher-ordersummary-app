/*
  # Create load sessions tables

  1. New Tables
    - `load_sessions`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `destination` (text)
      - `time` (text)
      - `progress` (jsonb)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `load_sessions` table
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS load_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  destination text NOT NULL,
  time text NOT NULL,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE load_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own load sessions"
  ON load_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own load sessions"
  ON load_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own load sessions"
  ON load_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own load sessions"
  ON load_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);