-- Session Quests Migration
-- This migration adds support for assigning specific quests to session codes
-- Allows teachers to create sessions with only specific topics/quests

-- ============================================================================
-- SESSION QUESTS JUNCTION TABLE
-- ============================================================================
-- Links session codes to specific quests that should be available
CREATE TABLE IF NOT EXISTS session_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_code_id UUID NOT NULL REFERENCES session_codes(id) ON DELETE CASCADE,
  quest_id VARCHAR(100) NOT NULL, -- Quest ID matches the id in quest JSON files
  quest_order INTEGER NOT NULL DEFAULT 1, -- Order in which quests should appear (1-based)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Each quest can only be assigned once per session
  UNIQUE(session_code_id, quest_id),
  
  -- Ensure quest_order is positive
  CONSTRAINT positive_quest_order CHECK (quest_order > 0)
);

-- Indexes for faster lookups
CREATE INDEX idx_session_quests_session_code ON session_quests(session_code_id);
CREATE INDEX idx_session_quests_quest_id ON session_quests(quest_id);
CREATE INDEX idx_session_quests_order ON session_quests(session_code_id, quest_order);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE session_quests IS 'Junction table linking session codes to specific quests that should be available to students';
COMMENT ON COLUMN session_quests.quest_id IS 'Quest ID matching the id field in quest JSON files (e.g., game_intro, tutorial_basics)';
COMMENT ON COLUMN session_quests.quest_order IS 'Display order for quests within the session (1-based, lower numbers appear first)';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- If a session has NO entries in session_quests, ALL quests will be available
-- This maintains backward compatibility with existing sessions
-- 
-- To assign quests to a session:
-- INSERT INTO session_quests (session_code_id, quest_id, quest_order)
-- VALUES 
--   ('session-uuid', 'game_intro', 1),
--   ('session-uuid', 'tutorial_basics', 2),
--   ('session-uuid', 'farming_loops', 3);
