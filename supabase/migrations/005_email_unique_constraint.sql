-- ============================================================================
-- Migration 005: Email Unique Constraint
-- ============================================================================
-- Adds a UNIQUE constraint on email in student_profiles.
-- Each student must have a unique email address across the entire system.
-- This enables email-based identity verification during login.
-- ============================================================================

-- Normalize existing emails to lowercase and trim whitespace
UPDATE student_profiles
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

-- Handle duplicate emails across profiles (keep oldest, merge)
DO $$
DECLARE
  dup RECORD;
  primary_id UUID;
  dupe_id UUID;
  dupe_ids UUID[];
BEGIN
  FOR dup IN
    SELECT email, array_agg(id ORDER BY created_at ASC) AS ids
    FROM student_profiles
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email
    HAVING COUNT(*) > 1
  LOOP
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

      -- Ensure session links are preserved
      INSERT INTO student_sessions (student_profile_id, session_code_id, joined_at)
        SELECT primary_id, session_code_id, created_at
        FROM student_profiles WHERE id = dupe_id AND session_code_id IS NOT NULL
      ON CONFLICT (student_profile_id, session_code_id) DO NOTHING;

      -- Delete the duplicate profile
      DELETE FROM student_profiles WHERE id = dupe_id;
    END LOOP;
  END LOOP;
END $$;

-- Add unique constraint on email
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_email_unique UNIQUE (email);

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON student_profiles(email);
