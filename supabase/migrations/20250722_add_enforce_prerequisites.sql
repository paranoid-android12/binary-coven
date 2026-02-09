-- Add enforce_prerequisites toggle to session_codes
-- When TRUE, students must complete prerequisite quests before starting dependent quests
-- When FALSE (default for backward compatibility), all session quests are immediately available

ALTER TABLE session_codes 
ADD COLUMN IF NOT EXISTS enforce_prerequisites BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN session_codes.enforce_prerequisites IS 
  'When TRUE, quest prerequisites must be completed before starting dependent quests. When FALSE, all assigned quests are immediately available.';
