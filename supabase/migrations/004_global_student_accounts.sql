-- ============================================================================
-- Migration 004: Global Student Accounts
-- ============================================================================
-- Converts per-session student accounts to global accounts.
-- A student registers once and can join multiple sessions.
--
-- Key changes:
--   1. New `student_sessions` junction table (student ↔ session)
--   2. `session_code_id` added to analytics tables for per-session tracking
--   3. Duplicate usernames across sessions are merged
--   4. Unique constraint changed: UNIQUE(username, session_code_id) → UNIQUE(username)
-- ============================================================================

-- Step 1: Create student_sessions junction table
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  session_code_id UUID NOT NULL REFERENCES session_codes(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(student_profile_id, session_code_id)
);

-- Step 2: Add session_code_id to analytics tables (nullable for backward compat)
ALTER TABLE quest_progress ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE objective_progress ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE code_executions ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);

-- Step 3: Backfill session_code_id on analytics tables from student_profiles
UPDATE quest_progress qp SET session_code_id = sp.session_code_id
FROM student_profiles sp WHERE qp.student_profile_id = sp.id AND qp.session_code_id IS NULL;

UPDATE objective_progress op SET session_code_id = sp.session_code_id
FROM student_profiles sp WHERE op.student_profile_id = sp.id AND op.session_code_id IS NULL;

UPDATE code_executions ce SET session_code_id = sp.session_code_id
FROM student_profiles sp WHERE ce.student_profile_id = sp.id AND ce.session_code_id IS NULL;

UPDATE learning_events le SET session_code_id = sp.session_code_id
FROM student_profiles sp WHERE le.student_profile_id = sp.id AND le.session_code_id IS NULL;

UPDATE game_saves gs SET session_code_id = sp.session_code_id
FROM student_profiles sp WHERE gs.student_profile_id = sp.id AND gs.session_code_id IS NULL;

-- Step 4: Handle duplicate usernames across sessions
-- Strategy: For each set of duplicates, keep the OLDEST profile as primary.
-- Re-point all analytics FKs, then merge session links.
DO $$
DECLARE
  dup RECORD;
  primary_id UUID;
  dupe_id UUID;
  dupe_ids UUID[];
BEGIN
  -- Find all usernames that appear in multiple sessions
  FOR dup IN
    SELECT username, array_agg(id ORDER BY created_at ASC) AS ids
    FROM student_profiles
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    -- First element is the primary (oldest)
    primary_id := dup.ids[1];
    dupe_ids := dup.ids[2:array_length(dup.ids, 1)];

    FOREACH dupe_id IN ARRAY dupe_ids
    LOOP
      -- Delete conflicting rows from duplicate that would violate unique constraints
      -- quest_progress: UNIQUE(student_profile_id, quest_id)
      DELETE FROM quest_progress
      WHERE student_profile_id = dupe_id
        AND quest_id IN (SELECT quest_id FROM quest_progress WHERE student_profile_id = primary_id);

      -- objective_progress: UNIQUE(student_profile_id, quest_id, phase_id, objective_index)
      DELETE FROM objective_progress
      WHERE student_profile_id = dupe_id
        AND (quest_id, phase_id, objective_index) IN (
          SELECT quest_id, phase_id, objective_index
          FROM objective_progress WHERE student_profile_id = primary_id
        );

      -- game_saves: UNIQUE(student_profile_id, save_name)
      DELETE FROM game_saves
      WHERE student_profile_id = dupe_id
        AND save_name IN (SELECT save_name FROM game_saves WHERE student_profile_id = primary_id);

      -- Now safely re-point remaining analytics from duplicate to primary
      UPDATE quest_progress SET student_profile_id = primary_id WHERE student_profile_id = dupe_id;
      UPDATE objective_progress SET student_profile_id = primary_id WHERE student_profile_id = dupe_id;
      UPDATE code_executions SET student_profile_id = primary_id WHERE student_profile_id = dupe_id;
      UPDATE learning_events SET student_profile_id = primary_id WHERE student_profile_id = dupe_id;
      UPDATE game_saves SET student_profile_id = primary_id WHERE student_profile_id = dupe_id;

      -- Ensure both sessions are linked to the primary profile
      -- (the primary's own session was already added; add the duplicate's session)
      INSERT INTO student_sessions (student_profile_id, session_code_id, joined_at)
        SELECT primary_id, session_code_id, created_at
        FROM student_profiles WHERE id = dupe_id
      ON CONFLICT (student_profile_id, session_code_id) DO NOTHING;

      -- If the duplicate had an email and the primary doesn't, copy it
      UPDATE student_profiles p
        SET email = d.email
        FROM student_profiles d
        WHERE p.id = primary_id
          AND d.id = dupe_id
          AND p.email IS NULL
          AND d.email IS NOT NULL;

      -- Delete the duplicate profile
      DELETE FROM student_profiles WHERE id = dupe_id;
    END LOOP;
  END LOOP;
END $$;

-- Step 5: Populate student_sessions from remaining student_profiles
-- (only for profiles not already in student_sessions from the merge step)
INSERT INTO student_sessions (student_profile_id, session_code_id, joined_at)
SELECT sp.id, sp.session_code_id, sp.created_at
FROM student_profiles sp
WHERE sp.session_code_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_sessions ss
    WHERE ss.student_profile_id = sp.id AND ss.session_code_id = sp.session_code_id
  );

-- Step 6: Drop old composite unique, add global unique
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_username_session_code_id_key;
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_username_unique UNIQUE (username);

-- Step 7: Make session_code_id nullable on student_profiles (transition period)
-- It stays for backward compat but the junction table is the source of truth.
ALTER TABLE student_profiles ALTER COLUMN session_code_id DROP NOT NULL;

-- Step 8: Indexes
CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_session ON student_sessions(session_code_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_session ON quest_progress(session_code_id);
CREATE INDEX IF NOT EXISTS idx_objective_progress_session ON objective_progress(session_code_id);
CREATE INDEX IF NOT EXISTS idx_code_executions_session ON code_executions(session_code_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_session ON learning_events(session_code_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_session ON game_saves(session_code_id);

-- Step 9: Update game_saves unique constraint to be per-student-per-session
-- Drop old constraint and add new one that includes session_code_id
ALTER TABLE game_saves DROP CONSTRAINT IF EXISTS game_saves_student_profile_id_save_name_key;
-- Backfill any remaining NULL session_code_ids on game_saves
UPDATE game_saves gs SET session_code_id = sp.session_code_id
FROM student_profiles sp WHERE gs.student_profile_id = sp.id AND gs.session_code_id IS NULL AND sp.session_code_id IS NOT NULL;
-- New constraint: one save per student per session per save_name
ALTER TABLE game_saves ADD CONSTRAINT game_saves_student_session_save_key
  UNIQUE (student_profile_id, session_code_id, save_name);

-- Step 10: RLS policies for student_sessions
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of student_sessions" ON student_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert of student_sessions" ON student_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of student_sessions" ON student_sessions
  FOR UPDATE USING (true);

-- Step 11: Update the student_progress_summary view to use student_sessions
-- Drop the old view and recreate
DROP VIEW IF EXISTS student_progress_summary;

CREATE VIEW student_progress_summary AS
SELECT
  sp.id AS student_profile_id,
  sp.username,
  sp.display_name,
  ss.session_code_id,
  sc.code AS session_code,
  sp.created_at AS joined_at,
  sp.last_login,
  COALESCE(qp_stats.quests_completed, 0) AS quests_completed,
  COALESCE(qp_stats.quests_active, 0) AS quests_active,
  COALESCE(qp_stats.total_time_spent_seconds, 0) AS total_time_spent_seconds,
  COALESCE(ce_stats.total_code_executions, 0) AS total_code_executions,
  gs.last_saved AS last_save_time
FROM student_profiles sp
JOIN student_sessions ss ON ss.student_profile_id = sp.id
JOIN session_codes sc ON sc.id = ss.session_code_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE state = 'completed') AS quests_completed,
    COUNT(*) FILTER (WHERE state = 'active') AS quests_active,
    COALESCE(SUM(time_spent_seconds), 0) AS total_time_spent_seconds
  FROM quest_progress
  WHERE student_profile_id = sp.id
    AND (session_code_id = ss.session_code_id OR session_code_id IS NULL)
) qp_stats ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_code_executions
  FROM code_executions
  WHERE student_profile_id = sp.id
    AND (session_code_id = ss.session_code_id OR session_code_id IS NULL)
) ce_stats ON true
LEFT JOIN LATERAL (
  SELECT last_saved
  FROM game_saves
  WHERE student_profile_id = sp.id
    AND (session_code_id = ss.session_code_id OR session_code_id IS NULL)
  ORDER BY last_saved DESC
  LIMIT 1
) gs ON true;
