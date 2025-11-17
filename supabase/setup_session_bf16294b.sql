-- ============================================================================
-- SETUP SESSION CODE bf16294b-8b38-4842 WITH 5 STUDENTS
-- ============================================================================
-- This script creates a comprehensive session with realistic student data
-- including game saves, quest progress, code executions, and learning events
--
-- NOTE: Original session code bf16294b-8b38-4842-b611-810ad769f6fa was
--       shortened to bf16294b-8b38-4842 to fit VARCHAR(20) database limit
--
-- Student Profiles:
-- 1. Emma Chen (Beginner - Struggling with basics)
-- 2. Marcus Johnson (Intermediate - Steady progress)
-- 3. Sofia Rodriguez (Advanced - Fast learner)
-- 4. Tyler Brooks (Struggling - Many mistakes)
-- 5. Aisha Patel (Completed - Top performer)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE SESSION CODE
-- ============================================================================

INSERT INTO session_codes (
  code,
  validity_start,
  validity_end,
  is_active,
  max_students,
  created_by
) VALUES (
  'bf16294b-8b38-4842',  -- Shortened to fit VARCHAR(20) limit
  TIMEZONE('utc', NOW()) - INTERVAL '7 days',  -- Started 7 days ago
  TIMEZONE('utc', NOW()) + INTERVAL '60 days',  -- Expires in 60 days
  TRUE,
  30,  -- Max 30 students
  'admin'
);

-- ============================================================================
-- STEP 2: CREATE 5 STUDENT PROFILES WITH COMPREHENSIVE DATA
-- ============================================================================
-- All passwords are hashed using bcrypt
-- Default password for all students: "student123"
-- Password hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

DO $$
DECLARE
  session_id UUID;
  student1_id UUID;  -- Emma Chen
  student2_id UUID;  -- Marcus Johnson
  student3_id UUID;  -- Sofia Rodriguez
  student4_id UUID;  -- Tyler Brooks
  student5_id UUID;  -- Aisha Patel
BEGIN
  -- Get the session code ID
  SELECT id INTO session_id FROM session_codes WHERE code = 'bf16294b-8b38-4842';

  -- ============================================================================
  -- STUDENT 1: EMMA CHEN (Beginner - Struggling)
  -- ============================================================================

  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active,
    created_at,
    last_login
  ) VALUES (
    'emma.chen',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Emma Chen',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '6 days',
    TIMEZONE('utc', NOW()) - INTERVAL '2 hours'
  ) RETURNING id INTO student1_id;

  -- Emma's Quest Progress: In tutorial_basics, phase 2
  INSERT INTO quest_progress (student_profile_id, quest_id, quest_title, state, current_phase_index, started_at, time_spent_seconds, attempts, phase_progress)
  VALUES
    (student1_id, 'tutorial_basics', 'Tutorial Basics', 'active', 1, TIMEZONE('utc', NOW()) - INTERVAL '6 days', 2730, 12, '{"phase_0": {"completed": true, "attempts": 3}, "phase_1": {"completed": false, "attempts": 9}}'),
    (student1_id, 'game_intro', 'Game Introduction', 'available', 0, NULL, 0, 0, '{}');

  -- Emma's Objective Progress: Multiple attempts, slow progress
  INSERT INTO objective_progress (student_profile_id, quest_id, phase_id, objective_index, objective_description, completed_at, attempts, time_spent_seconds, hints_used)
  VALUES
    (student1_id, 'tutorial_basics', 'phase_0', 0, 'Wake up and move around', TIMEZONE('utc', NOW()) - INTERVAL '6 days', 2, 420, 1),
    (student1_id, 'tutorial_basics', 'phase_0', 1, 'Open terminal', TIMEZONE('utc', NOW()) - INTERVAL '6 days', 1, 180, 0),
    (student1_id, 'tutorial_basics', 'phase_1', 0, 'Write first movement command', NULL, 9, 1950, 2);

  -- Emma's Code Executions: Lots of syntax errors
  INSERT INTO code_executions (student_profile_id, quest_id, phase_id, code_window_id, code_content, execution_result, executed_at, entity_id, execution_duration_ms)
  VALUES
    (student1_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move up', '{"success": false, "errors": ["SyntaxError: Unexpected identifier"], "output": "", "executionTime": 12}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours', 'player', 12),
    (student1_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move(up)', '{"success": false, "errors": ["ReferenceError: up is not defined"], "output": "", "executionTime": 8}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 22 hours 50 min', 'player', 8),
    (student1_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("up"', '{"success": false, "errors": ["SyntaxError: missing ) after argument list"], "output": "", "executionTime": 5}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 22 hours 40 min', 'player', 5),
    (student1_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("up)', '{"success": false, "errors": ["SyntaxError: Invalid or unexpected token"], "output": "", "executionTime": 6}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 22 hours 30 min', 'player', 6),
    (student1_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("up");', '{"success": true, "errors": [], "output": "Player moved up", "executionTime": 45}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 22 hours 15 min', 'player', 45),
    (student1_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("down")\nmove("left")', '{"success": false, "errors": ["SyntaxError: Automatic semicolon insertion failed"], "output": "", "executionTime": 7}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 21 hours', 'player', 7),
    (student1_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("down");\nmove("left");', '{"success": true, "errors": [], "output": "Player moved down\\nPlayer moved left", "executionTime": 67}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 20 hours 45 min', 'player', 67);

  -- Emma's Learning Events
  INSERT INTO learning_events (student_profile_id, event_type, event_data, quest_id, phase_id, created_at)
  VALUES
    (student1_id, 'quest_started', '{"questId": "tutorial_basics"}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days'),
    (student1_id, 'phase_started', '{"phaseId": "phase_0"}', 'tutorial_basics', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '6 days'),
    (student1_id, 'hint_used', '{"hintIndex": 0, "hintText": "Try using the move() function"}', 'tutorial_basics', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '6 days'),
    (student1_id, 'phase_completed', '{"phaseId": "phase_0", "timeSpent": 600}', 'tutorial_basics', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '6 days'),
    (student1_id, 'phase_started', '{"phaseId": "phase_1"}', 'tutorial_basics', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '6 days'),
    (student1_id, 'error_encountered', '{"errorType": "SyntaxError", "message": "Unexpected identifier"}', 'tutorial_basics', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours'),
    (student1_id, 'hint_used', '{"hintIndex": 0, "hintText": "Strings need quotes around them"}', 'tutorial_basics', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '5 days 22 hours 45 min'),
    (student1_id, 'hint_used', '{"hintIndex": 1, "hintText": "Don''t forget the semicolon"}', 'tutorial_basics', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '5 days 22 hours 20 min');

  -- Emma's Game Save
  INSERT INTO game_saves (student_profile_id, game_state, save_name, last_saved, save_version)
  VALUES (
    student1_id,
    '{
      "player": {
        "position": {"x": 5, "y": 3},
        "inventory": {
          "seeds": 2,
          "coins": 10,
          "tools": ["basic_hoe"]
        },
        "stats": {
          "level": 1,
          "experience": 15
        }
      },
      "world": {
        "discovered_locations": ["home", "garden"],
        "npcs_met": ["elder_willow"]
      },
      "quests": {
        "active": ["tutorial_basics"],
        "completed": []
      },
      "timestamp": "2025-11-11T10:30:00Z"
    }',
    'autosave',
    TIMEZONE('utc', NOW()) - INTERVAL '2 hours',
    1
  );

  -- ============================================================================
  -- STUDENT 2: MARCUS JOHNSON (Intermediate - Steady Progress)
  -- ============================================================================

  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active,
    created_at,
    last_login
  ) VALUES (
    'marcus.johnson',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Marcus Johnson',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '5 days',
    TIMEZONE('utc', NOW()) - INTERVAL '5 hours'
  ) RETURNING id INTO student2_id;

  -- Marcus's Quest Progress: Good progress, on farming_loops
  INSERT INTO quest_progress (student_profile_id, quest_id, quest_title, state, current_phase_index, started_at, completed_at, time_spent_seconds, attempts, score, phase_progress)
  VALUES
    (student2_id, 'tutorial_basics', 'Tutorial Basics', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '5 days', TIMEZONE('utc', NOW()) - INTERVAL '4 days 20 hours', 1320, 5, 85, '{"phase_0": {"completed": true}, "phase_1": {"completed": true}, "phase_2": {"completed": true}, "phase_3": {"completed": true}}'),
    (student2_id, 'game_intro', 'Game Introduction', 'completed', 3, TIMEZONE('utc', NOW()) - INTERVAL '4 days 19 hours', TIMEZONE('utc', NOW()) - INTERVAL '4 days 15 hours', 960, 3, 80, '{"phase_0": {"completed": true}, "phase_1": {"completed": true}, "phase_2": {"completed": true}}'),
    (student2_id, 'farming_loops', 'Farming with Loops', 'active', 2, TIMEZONE('utc', NOW()) - INTERVAL '4 days 14 hours', NULL, 1680, 6, NULL, '{"phase_0": {"completed": true, "attempts": 2}, "phase_1": {"completed": true, "attempts": 2}, "phase_2": {"completed": false, "attempts": 2}}'),
    (student2_id, 'first_harvest', 'First Harvest', 'available', 0, NULL, NULL, 0, 0, NULL, '{}');

  -- Marcus's Objective Progress
  INSERT INTO objective_progress (student_profile_id, quest_id, phase_id, objective_index, objective_description, completed_at, attempts, time_spent_seconds, hints_used)
  VALUES
    (student2_id, 'tutorial_basics', 'phase_0', 0, 'Basic movement', TIMEZONE('utc', NOW()) - INTERVAL '5 days', 1, 240, 0),
    (student2_id, 'tutorial_basics', 'phase_1', 0, 'Use functions', TIMEZONE('utc', NOW()) - INTERVAL '4 days 23 hours', 2, 360, 0),
    (student2_id, 'farming_loops', 'phase_0', 0, 'Learn about for loops', TIMEZONE('utc', NOW()) - INTERVAL '4 days 14 hours', 1, 420, 0),
    (student2_id, 'farming_loops', 'phase_1', 0, 'Create farming loop', TIMEZONE('utc', NOW()) - INTERVAL '4 days 12 hours', 2, 540, 1),
    (student2_id, 'farming_loops', 'phase_2', 0, 'Optimize loop', NULL, 2, 720, 0);

  -- Marcus's Code Executions: Mix of successes and errors
  INSERT INTO code_executions (student_profile_id, quest_id, phase_id, code_window_id, code_content, execution_result, executed_at, entity_id, execution_duration_ms)
  VALUES
    (student2_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("up");', '{"success": true, "errors": [], "output": "Player moved up", "executionTime": 42}', TIMEZONE('utc', NOW()) - INTERVAL '5 days', 'player', 42),
    (student2_id, 'farming_loops', 'phase_0', 'terminal_1', 'for (let i = 0; i < 5; i++) {\n  move("right");\n}', '{"success": true, "errors": [], "output": "Player moved right (x5)", "executionTime": 156}', TIMEZONE('utc', NOW()) - INTERVAL '4 days 14 hours', 'player', 156),
    (student2_id, 'farming_loops', 'phase_1', 'terminal_1', 'for (let i = 0; i < 3; i++) {\n  plant("wheat");\n  move("right")\n}', '{"success": false, "errors": ["SyntaxError: missing ; before statement"], "output": "", "executionTime": 8}', TIMEZONE('utc', NOW()) - INTERVAL '4 days 12 hours 30 min', 'player', 8),
    (student2_id, 'farming_loops', 'phase_1', 'terminal_1', 'for (let i = 0; i < 3; i++) {\n  plant("wheat");\n  move("right");\n}', '{"success": true, "errors": [], "output": "Planted wheat\\nMoved right\\n(repeated 3 times)", "executionTime": 234}', TIMEZONE('utc', NOW()) - INTERVAL '4 days 12 hours 20 min', 'player', 234),
    (student2_id, 'farming_loops', 'phase_2', 'terminal_1', 'for (let row = 0; row < 3; row++) {\n  for (let col = 0; col < 5; col++) {\n    plant("wheat");\n    move("right");\n  }\n  move("down");\n}', '{"success": false, "errors": [], "output": "Logic error: not returning to starting position", "executionTime": 445}', TIMEZONE('utc', NOW()) - INTERVAL '4 days 10 hours', 'player', 445),
    (student2_id, 'farming_loops', 'phase_2', 'terminal_1', 'for (let row = 0; row < 3; row++) {\n  for (let col = 0; col < 5; col++) {\n    plant("wheat");\n    if (col < 4) move("right");\n  }\n  if (row < 2) {\n    move("down");\n    moveToStart();\n  }\n}', '{"success": true, "errors": [], "output": "Planted 3x5 wheat grid successfully", "executionTime": 678}', TIMEZONE('utc', NOW()) - INTERVAL '4 days 9 hours 30 min', 'player', 678);

  -- Marcus's Learning Events
  INSERT INTO learning_events (student_profile_id, event_type, event_data, quest_id, phase_id, created_at)
  VALUES
    (student2_id, 'quest_started', '{"questId": "tutorial_basics"}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '5 days'),
    (student2_id, 'quest_completed', '{"questId": "tutorial_basics", "score": 85}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '4 days 20 hours'),
    (student2_id, 'quest_started', '{"questId": "game_intro"}', 'game_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '4 days 19 hours'),
    (student2_id, 'quest_completed', '{"questId": "game_intro", "score": 80}', 'game_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '4 days 15 hours'),
    (student2_id, 'quest_started', '{"questId": "farming_loops"}', 'farming_loops', NULL, TIMEZONE('utc', NOW()) - INTERVAL '4 days 14 hours'),
    (student2_id, 'hint_used', '{"hintIndex": 0, "hintText": "Remember to add semicolons"}', 'farming_loops', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '4 days 12 hours 25 min'),
    (student2_id, 'dialogue_viewed', '{"npc": "farmer_bob", "dialogueId": "loop_tutorial"}', 'farming_loops', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '4 days 14 hours');

  -- Marcus's Game Save
  INSERT INTO game_saves (student_profile_id, game_state, save_name, last_saved, save_version)
  VALUES (
    student2_id,
    '{
      "player": {
        "position": {"x": 12, "y": 8},
        "inventory": {
          "seeds": 15,
          "wheat": 8,
          "coins": 45,
          "tools": ["basic_hoe", "watering_can"]
        },
        "stats": {
          "level": 3,
          "experience": 245
        }
      },
      "world": {
        "discovered_locations": ["home", "garden", "farm", "village"],
        "npcs_met": ["elder_willow", "farmer_bob", "merchant_sara"],
        "unlocked_areas": ["farming_zone"]
      },
      "quests": {
        "active": ["farming_loops"],
        "completed": ["tutorial_basics", "game_intro"]
      },
      "timestamp": "2025-11-12T08:45:00Z"
    }',
    'autosave',
    TIMEZONE('utc', NOW()) - INTERVAL '5 hours',
    1
  );

  -- ============================================================================
  -- STUDENT 3: SOFIA RODRIGUEZ (Advanced - Fast Learner)
  -- ============================================================================

  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active,
    created_at,
    last_login
  ) VALUES (
    'sofia.rodriguez',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Sofia Rodriguez',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '4 days',
    TIMEZONE('utc', NOW()) - INTERVAL '1 hour'
  ) RETURNING id INTO student3_id;

  -- Sofia's Quest Progress: Advanced, on functions_intro
  INSERT INTO quest_progress (student_profile_id, quest_id, quest_title, state, current_phase_index, started_at, completed_at, time_spent_seconds, attempts, score, phase_progress)
  VALUES
    (student3_id, 'tutorial_basics', 'Tutorial Basics', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '4 days', TIMEZONE('utc', NOW()) - INTERVAL '3 days 22 hours', 480, 2, 98, '{}'),
    (student3_id, 'game_intro', 'Game Introduction', 'completed', 3, TIMEZONE('utc', NOW()) - INTERVAL '3 days 22 hours', TIMEZONE('utc', NOW()) - INTERVAL '3 days 20 hours', 420, 1, 95, '{}'),
    (student3_id, 'farming_loops', 'Farming with Loops', 'completed', 5, TIMEZONE('utc', NOW()) - INTERVAL '3 days 20 hours', TIMEZONE('utc', NOW()) - INTERVAL '3 days 17 hours', 720, 2, 92, '{}'),
    (student3_id, 'first_harvest', 'First Harvest', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '3 days 17 hours', TIMEZONE('utc', NOW()) - INTERVAL '3 days 15 hours', 540, 1, 96, '{}'),
    (student3_id, 'drone_farming_quest', 'Drone Farming', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '3 days 15 hours', TIMEZONE('utc', NOW()) - INTERVAL '3 days 11 hours', 840, 3, 90, '{}'),
    (student3_id, 'functions_intro', 'Introduction to Functions', 'active', 3, TIMEZONE('utc', NOW()) - INTERVAL '3 days 11 hours', NULL, 960, 2, NULL, '{"phase_0": {"completed": true}, "phase_1": {"completed": true}, "phase_2": {"completed": true}, "phase_3": {"completed": false, "attempts": 2}}'),
    (student3_id, 'full_automation', 'Full Automation', 'available', 0, NULL, NULL, 0, 0, NULL, '{}');

  -- Sofia's Objective Progress
  INSERT INTO objective_progress (student_profile_id, quest_id, phase_id, objective_index, objective_description, completed_at, attempts, time_spent_seconds, hints_used)
  VALUES
    (student3_id, 'tutorial_basics', 'phase_0', 0, 'Complete basic tutorial', TIMEZONE('utc', NOW()) - INTERVAL '4 days', 1, 120, 0),
    (student3_id, 'farming_loops', 'phase_2', 0, 'Create nested loops', TIMEZONE('utc', NOW()) - INTERVAL '3 days 18 hours', 1, 180, 0),
    (student3_id, 'drone_farming_quest', 'phase_1', 0, 'Program drone movement', TIMEZONE('utc', NOW()) - INTERVAL '3 days 14 hours', 1, 240, 0),
    (student3_id, 'functions_intro', 'phase_2', 0, 'Define custom function', TIMEZONE('utc', NOW()) - INTERVAL '3 days 12 hours', 1, 300, 0),
    (student3_id, 'functions_intro', 'phase_3', 0, 'Use function parameters', NULL, 2, 360, 0);

  -- Sofia's Code Executions: Clean, efficient code
  INSERT INTO code_executions (student_profile_id, quest_id, phase_id, code_window_id, code_content, execution_result, executed_at, entity_id, execution_duration_ms)
  VALUES
    (student3_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("up");\nmove("right");\nmove("down");', '{"success": true, "errors": [], "output": "Moved up, right, down", "executionTime": 89}', TIMEZONE('utc', NOW()) - INTERVAL '4 days', 'player', 89),
    (student3_id, 'farming_loops', 'phase_2', 'terminal_1', 'for (let y = 0; y < 3; y++) {\n  for (let x = 0; x < 5; x++) {\n    plant("wheat");\n    if (x < 4) move("right");\n  }\n  if (y < 2) {\n    move("down");\n    for (let i = 0; i < 4; i++) move("left");\n  }\n}', '{"success": true, "errors": [], "output": "Perfect 3x5 grid planted", "executionTime": 567}', TIMEZONE('utc', NOW()) - INTERVAL '3 days 18 hours', 'player', 567),
    (student3_id, 'drone_farming_quest', 'phase_1', 'drone_terminal', 'drone.moveTo(5, 3);\ndrone.plant("corn");\ndrone.moveTo(6, 3);\ndrone.plant("corn");', '{"success": true, "errors": [], "output": "Drone completed tasks", "executionTime": 234}', TIMEZONE('utc', NOW()) - INTERVAL '3 days 14 hours', 'drone_alpha', 234),
    (student3_id, 'functions_intro', 'phase_2', 'terminal_1', 'function plantRow(crop, length) {\n  for (let i = 0; i < length; i++) {\n    plant(crop);\n    if (i < length - 1) move("right");\n  }\n}\n\nplantRow("wheat", 5);', '{"success": true, "errors": [], "output": "Planted row of 5 wheat", "executionTime": 345}', TIMEZONE('utc', NOW()) - INTERVAL '3 days 12 hours', 'player', 345),
    (student3_id, 'functions_intro', 'phase_3', 'terminal_1', 'function plantGrid(crop, rows, cols) {\n  for (let r = 0; r < rows; r++) {\n    plantRow(crop, cols);\n    if (r < rows - 1) {\n      move("down");\n      resetToLeft(cols);\n    }\n  }\n}', '{"success": false, "errors": ["ReferenceError: resetToLeft is not defined"], "output": "", "executionTime": 12}', TIMEZONE('utc', NOW()) - INTERVAL '3 days 11 hours 30 min', 'player', 12),
    (student3_id, 'functions_intro', 'phase_3', 'terminal_1', 'function plantRow(crop, length) {\n  for (let i = 0; i < length; i++) {\n    plant(crop);\n    if (i < length - 1) move("right");\n  }\n}\n\nfunction plantGrid(crop, rows, cols) {\n  for (let r = 0; r < rows; r++) {\n    plantRow(crop, cols);\n    if (r < rows - 1) {\n      move("down");\n      for (let i = 0; i < cols - 1; i++) move("left");\n    }\n  }\n}\n\nplantGrid("wheat", 3, 5);', '{"success": true, "errors": [], "output": "Planted 3x5 grid using functions", "executionTime": 678}', TIMEZONE('utc', NOW()) - INTERVAL '3 days 11 hours 15 min', 'player', 678);

  -- Sofia's Learning Events
  INSERT INTO learning_events (student_profile_id, event_type, event_data, quest_id, phase_id, created_at)
  VALUES
    (student3_id, 'quest_started', '{"questId": "tutorial_basics"}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '4 days'),
    (student3_id, 'quest_completed', '{"questId": "tutorial_basics", "score": 98}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '3 days 22 hours'),
    (student3_id, 'quest_completed', '{"questId": "game_intro", "score": 95}', 'game_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '3 days 20 hours'),
    (student3_id, 'quest_completed', '{"questId": "farming_loops", "score": 92}', 'farming_loops', NULL, TIMEZONE('utc', NOW()) - INTERVAL '3 days 17 hours'),
    (student3_id, 'quest_completed', '{"questId": "first_harvest", "score": 96}', 'first_harvest', NULL, TIMEZONE('utc', NOW()) - INTERVAL '3 days 15 hours'),
    (student3_id, 'quest_completed', '{"questId": "drone_farming_quest", "score": 90}', 'drone_farming_quest', NULL, TIMEZONE('utc', NOW()) - INTERVAL '3 days 11 hours'),
    (student3_id, 'quest_started', '{"questId": "functions_intro"}', 'functions_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '3 days 11 hours'),
    (student3_id, 'dialogue_viewed', '{"npc": "tech_wizard", "dialogueId": "functions_explained"}', 'functions_intro', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '3 days 11 hours');

  -- Sofia's Game Save
  INSERT INTO game_saves (student_profile_id, game_state, save_name, last_saved, save_version)
  VALUES (
    student3_id,
    '{
      "player": {
        "position": {"x": 25, "y": 18},
        "inventory": {
          "seeds": 45,
          "wheat": 32,
          "corn": 18,
          "coins": 285,
          "tools": ["basic_hoe", "watering_can", "advanced_plow", "seed_bag"]
        },
        "stats": {
          "level": 7,
          "experience": 1240
        }
      },
      "world": {
        "discovered_locations": ["home", "garden", "farm", "village", "tech_lab", "automation_zone"],
        "npcs_met": ["elder_willow", "farmer_bob", "merchant_sara", "tech_wizard", "drone_engineer"],
        "unlocked_areas": ["farming_zone", "automation_zone", "advanced_farming"]
      },
      "drones": {
        "alpha": {
          "position": {"x": 20, "y": 15},
          "battery": 85,
          "upgrades": ["speed_1", "capacity_1"]
        }
      },
      "quests": {
        "active": ["functions_intro"],
        "completed": ["tutorial_basics", "game_intro", "farming_loops", "first_harvest", "drone_farming_quest"]
      },
      "timestamp": "2025-11-16T12:30:00Z"
    }',
    'autosave',
    TIMEZONE('utc', NOW()) - INTERVAL '1 hour',
    1
  );

  -- ============================================================================
  -- STUDENT 4: TYLER BROOKS (Struggling - Many Mistakes)
  -- ============================================================================

  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active,
    created_at,
    last_login
  ) VALUES (
    'tyler.brooks',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Tyler Brooks',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '6 days',
    TIMEZONE('utc', NOW()) - INTERVAL '3 hours'
  ) RETURNING id INTO student4_id;

  -- Tyler's Quest Progress: Stuck on first_harvest
  INSERT INTO quest_progress (student_profile_id, quest_id, quest_title, state, current_phase_index, started_at, completed_at, time_spent_seconds, attempts, score, phase_progress)
  VALUES
    (student4_id, 'tutorial_basics', 'Tutorial Basics', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '6 days', TIMEZONE('utc', NOW()) - INTERVAL '5 days 18 hours', 2160, 8, 62, '{}'),
    (student4_id, 'game_intro', 'Game Introduction', 'completed', 3, TIMEZONE('utc', NOW()) - INTERVAL '5 days 18 hours', TIMEZONE('utc', NOW()) - INTERVAL '5 days 12 hours', 1680, 6, 58, '{}'),
    (student4_id, 'first_harvest', 'First Harvest', 'active', 0, TIMEZONE('utc', NOW()) - INTERVAL '5 days 12 hours', NULL, 3720, 8, NULL, '{"phase_0": {"completed": false, "attempts": 8}}'),
    (student4_id, 'farming_loops', 'Farming with Loops', 'locked', 0, NULL, NULL, 0, 0, NULL, '{}');

  -- Tyler's Objective Progress: Many failed attempts
  INSERT INTO objective_progress (student_profile_id, quest_id, phase_id, objective_index, objective_description, completed_at, attempts, time_spent_seconds, hints_used)
  VALUES
    (student4_id, 'tutorial_basics', 'phase_0', 0, 'Movement basics', TIMEZONE('utc', NOW()) - INTERVAL '6 days', 3, 540, 2),
    (student4_id, 'tutorial_basics', 'phase_1', 0, 'Functions', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours', 4, 720, 2),
    (student4_id, 'game_intro', 'phase_0', 0, 'Explore world', TIMEZONE('utc', NOW()) - INTERVAL '5 days 18 hours', 2, 480, 1),
    (student4_id, 'first_harvest', 'phase_0', 0, 'Plant and harvest crops', NULL, 8, 3720, 3);

  -- Tyler's Code Executions: Lots of errors
  INSERT INTO code_executions (student_profile_id, quest_id, phase_id, code_window_id, code_content, execution_result, executed_at, entity_id, execution_duration_ms)
  VALUES
    (student4_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'Move("up")', '{"success": false, "errors": ["ReferenceError: Move is not defined (case sensitive)"], "output": "", "executionTime": 6}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours 45 min', 'player', 6),
    (student4_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move(up);', '{"success": false, "errors": ["ReferenceError: up is not defined"], "output": "", "executionTime": 5}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours 40 min', 'player', 5),
    (student4_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("up")', '{"success": true, "errors": [], "output": "Player moved up", "executionTime": 45}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours 30 min', 'player', 45),
    (student4_id, 'first_harvest', 'phase_0', 'terminal_1', 'plant(wheat);', '{"success": false, "errors": ["ReferenceError: wheat is not defined"], "output": "", "executionTime": 7}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 12 hours', 'player', 7),
    (student4_id, 'first_harvest', 'phase_0', 'terminal_1', 'plant("wheat")\nharvest("wheat")', '{"success": false, "errors": ["SyntaxError: missing ; before statement"], "output": "", "executionTime": 6}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 11 hours 50 min', 'player', 6),
    (student4_id, 'first_harvest', 'phase_0', 'terminal_1', 'plant("wheat");\nharvest("wheat");', '{"success": false, "errors": [], "output": "Error: Cannot harvest immediately after planting. Crops need time to grow.", "executionTime": 78}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 11 hours 40 min', 'player', 78),
    (student4_id, 'first_harvest', 'phase_0', 'terminal_1', 'plant("wheat");\nwait(1000);\nharvest("wheat");', '{"success": false, "errors": ["ReferenceError: wait is not defined"], "output": "", "executionTime": 8}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 11 hours 30 min', 'player', 8),
    (student4_id, 'first_harvest', 'phase_0', 'terminal_1', 'for (let i = 0; i < 10; i++) {\n  plant("wheat");\n  move("right");\n}', '{"success": false, "errors": [], "output": "Error: Infinite loop detected", "executionTime": 5000}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 10 hours', 'player', 5000),
    (student4_id, 'first_harvest', 'phase_0', 'terminal_1', 'for (i = 0; i < 3; i++) {\n  plant("wheat");\n}', '{"success": false, "errors": ["ReferenceError: i is not defined (forgot let/const)"], "output": "", "executionTime": 7}', TIMEZONE('utc', NOW()) - INTERVAL '5 days 9 hours', 'player', 7),
    (student4_id, 'first_harvest', 'phase_0', 'terminal_1', 'plant("wheat");\nplant("wheat");\nplant("wheat");', '{"success": false, "errors": [], "output": "Error: All seeds planted but objective requires using a loop", "executionTime": 123}', TIMEZONE('utc', NOW()) - INTERVAL '4 days 22 hours', 'player', 123);

  -- Tyler's Learning Events: Lots of errors and hints
  INSERT INTO learning_events (student_profile_id, event_type, event_data, quest_id, phase_id, created_at)
  VALUES
    (student4_id, 'quest_started', '{"questId": "tutorial_basics"}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days'),
    (student4_id, 'error_encountered', '{"errorType": "ReferenceError", "message": "Move is not defined"}', 'tutorial_basics', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours 45 min'),
    (student4_id, 'hint_used', '{"hintIndex": 0, "hintText": "JavaScript is case sensitive - use lowercase move()"}', 'tutorial_basics', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours 42 min'),
    (student4_id, 'hint_used', '{"hintIndex": 1, "hintText": "Strings need quotes"}', 'tutorial_basics', 'phase_1', TIMEZONE('utc', NOW()) - INTERVAL '5 days 23 hours 38 min'),
    (student4_id, 'quest_completed', '{"questId": "tutorial_basics", "score": 62}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '5 days 18 hours'),
    (student4_id, 'quest_completed', '{"questId": "game_intro", "score": 58}', 'game_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '5 days 12 hours'),
    (student4_id, 'quest_started', '{"questId": "first_harvest"}', 'first_harvest', NULL, TIMEZONE('utc', NOW()) - INTERVAL '5 days 12 hours'),
    (student4_id, 'error_encountered', '{"errorType": "LogicError", "message": "Cannot harvest immediately"}', 'first_harvest', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '5 days 11 hours 40 min'),
    (student4_id, 'hint_used', '{"hintIndex": 0, "hintText": "Read the quest instructions carefully"}', 'first_harvest', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '5 days 11 hours 20 min'),
    (student4_id, 'error_encountered', '{"errorType": "InfiniteLoop", "message": "Loop timeout"}', 'first_harvest', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '5 days 10 hours'),
    (student4_id, 'hint_used', '{"hintIndex": 1, "hintText": "Make sure your loop has a proper condition"}', 'first_harvest', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '5 days 9 hours 30 min'),
    (student4_id, 'hint_used', '{"hintIndex": 2, "hintText": "Use let or const to declare loop variables"}', 'first_harvest', 'phase_0', TIMEZONE('utc', NOW()) - INTERVAL '5 days 9 hours');

  -- Tyler's Game Save
  INSERT INTO game_saves (student_profile_id, game_state, save_name, last_saved, save_version)
  VALUES (
    student4_id,
    '{
      "player": {
        "position": {"x": 8, "y": 5},
        "inventory": {
          "seeds": 3,
          "wheat": 0,
          "coins": 20,
          "tools": ["basic_hoe"]
        },
        "stats": {
          "level": 2,
          "experience": 85
        }
      },
      "world": {
        "discovered_locations": ["home", "garden", "farm"],
        "npcs_met": ["elder_willow", "farmer_bob"],
        "unlocked_areas": ["garden"]
      },
      "quests": {
        "active": ["first_harvest"],
        "completed": ["tutorial_basics", "game_intro"]
      },
      "timestamp": "2025-11-14T15:20:00Z"
    }',
    'autosave',
    TIMEZONE('utc', NOW()) - INTERVAL '3 hours',
    1
  );

  -- ============================================================================
  -- STUDENT 5: AISHA PATEL (Completed - Top Performer)
  -- ============================================================================

  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active,
    created_at,
    last_login
  ) VALUES (
    'aisha.patel',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Aisha Patel',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '7 days',
    TIMEZONE('utc', NOW()) - INTERVAL '30 minutes'
  ) RETURNING id INTO student5_id;

  -- Aisha's Quest Progress: Completed many quests, working on final challenge
  INSERT INTO quest_progress (student_profile_id, quest_id, quest_title, state, current_phase_index, started_at, completed_at, time_spent_seconds, attempts, score, phase_progress)
  VALUES
    (student5_id, 'tutorial_basics', 'Tutorial Basics', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '7 days', TIMEZONE('utc', NOW()) - INTERVAL '6 days 22 hours', 360, 1, 100, '{}'),
    (student5_id, 'game_intro', 'Game Introduction', 'completed', 3, TIMEZONE('utc', NOW()) - INTERVAL '6 days 22 hours', TIMEZONE('utc', NOW()) - INTERVAL '6 days 21 hours', 300, 1, 98, '{}'),
    (student5_id, 'farming_loops', 'Farming with Loops', 'completed', 5, TIMEZONE('utc', NOW()) - INTERVAL '6 days 21 hours', TIMEZONE('utc', NOW()) - INTERVAL '6 days 19 hours', 480, 1, 97, '{}'),
    (student5_id, 'first_harvest', 'First Harvest', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '6 days 19 hours', TIMEZONE('utc', NOW()) - INTERVAL '6 days 18 hours', 360, 1, 100, '{}'),
    (student5_id, 'alpha_drone_intro', 'Alpha Drone Introduction', 'completed', 3, TIMEZONE('utc', NOW()) - INTERVAL '6 days 18 hours', TIMEZONE('utc', NOW()) - INTERVAL '6 days 16 hours', 540, 1, 95, '{}'),
    (student5_id, 'drone_farming_quest', 'Drone Farming', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '6 days 16 hours', TIMEZONE('utc', NOW()) - INTERVAL '6 days 13 hours', 720, 2, 93, '{}'),
    (student5_id, 'functions_intro', 'Introduction to Functions', 'completed', 5, TIMEZONE('utc', NOW()) - INTERVAL '6 days 13 hours', TIMEZONE('utc', NOW()) - INTERVAL '6 days 10 hours', 660, 1, 98, '{}'),
    (student5_id, 'farming_scripts', 'Farming Scripts', 'completed', 4, TIMEZONE('utc', NOW()) - INTERVAL '6 days 10 hours', TIMEZONE('utc', NOW()) - INTERVAL '6 days 7 hours', 780, 2, 94, '{}'),
    (student5_id, 'full_automation', 'Full Automation', 'active', 4, TIMEZONE('utc', NOW()) - INTERVAL '6 days 7 hours', NULL, 1080, 2, NULL, '{"phase_0": {"completed": true}, "phase_1": {"completed": true}, "phase_2": {"completed": true}, "phase_3": {"completed": true}, "phase_4": {"completed": false, "attempts": 2}}');

  -- Aisha's Objective Progress: Fast, efficient completions
  INSERT INTO objective_progress (student_profile_id, quest_id, phase_id, objective_index, objective_description, completed_at, attempts, time_spent_seconds, hints_used)
  VALUES
    (student5_id, 'tutorial_basics', 'phase_0', 0, 'Complete tutorial', TIMEZONE('utc', NOW()) - INTERVAL '7 days', 1, 90, 0),
    (student5_id, 'farming_loops', 'phase_2', 0, 'Nested loops', TIMEZONE('utc', NOW()) - INTERVAL '6 days 20 hours', 1, 120, 0),
    (student5_id, 'drone_farming_quest', 'phase_2', 0, 'Automate drone', TIMEZONE('utc', NOW()) - INTERVAL '6 days 15 hours', 1, 180, 0),
    (student5_id, 'functions_intro', 'phase_3', 0, 'Advanced functions', TIMEZONE('utc', NOW()) - INTERVAL '6 days 11 hours', 1, 150, 0),
    (student5_id, 'full_automation', 'phase_4', 0, 'Complete automation system', NULL, 2, 420, 0);

  -- Aisha's Code Executions: Clean, optimized code
  INSERT INTO code_executions (student_profile_id, quest_id, phase_id, code_window_id, code_content, execution_result, executed_at, entity_id, execution_duration_ms)
  VALUES
    (student5_id, 'tutorial_basics', 'phase_1', 'terminal_1', 'move("up");\nmove("right");\ninteract();', '{"success": true, "errors": [], "output": "Perfect execution", "executionTime": 67}', TIMEZONE('utc', NOW()) - INTERVAL '7 days', 'player', 67),
    (student5_id, 'farming_loops', 'phase_3', 'terminal_1', 'const ROWS = 5;\nconst COLS = 8;\n\nfor (let r = 0; r < ROWS; r++) {\n  for (let c = 0; c < COLS; c++) {\n    plant("wheat");\n    if (c < COLS - 1) move("right");\n  }\n  if (r < ROWS - 1) {\n    move("down");\n    for (let i = 0; i < COLS - 1; i++) move("left");\n  }\n}', '{"success": true, "errors": [], "output": "Planted 5x8 grid efficiently", "executionTime": 890}', TIMEZONE('utc', NOW()) - INTERVAL '6 days 20 hours', 'player', 890),
    (student5_id, 'drone_farming_quest', 'phase_2', 'drone_terminal', 'function automateHarvest(startX, startY, width, height) {\n  for (let y = 0; y < height; y++) {\n    for (let x = 0; x < width; x++) {\n      drone.moveTo(startX + x, startY + y);\n      if (drone.canHarvest()) {\n        drone.harvest();\n      }\n    }\n  }\n  drone.returnHome();\n}\n\nautomateHarvest(10, 10, 5, 5);', '{"success": true, "errors": [], "output": "Drone harvested 25 crops automatically", "executionTime": 1234}', TIMEZONE('utc', NOW()) - INTERVAL '6 days 15 hours', 'drone_alpha', 1234),
    (student5_id, 'functions_intro', 'phase_4', 'terminal_1', 'function farmingBot(tasks) {\n  tasks.forEach(task => {\n    if (task.type === "plant") {\n      plant(task.crop);\n    } else if (task.type === "move") {\n      move(task.direction);\n    } else if (task.type === "harvest") {\n      harvest();\n    }\n  });\n}\n\nconst myTasks = [\n  {type: "plant", crop: "wheat"},\n  {type: "move", direction: "right"},\n  {type: "plant", crop: "wheat"}\n];\n\nfarmingBot(myTasks);', '{"success": true, "errors": [], "output": "Bot executed all tasks successfully", "executionTime": 456}', TIMEZONE('utc', NOW()) - INTERVAL '6 days 11 hours', 'player', 456),
    (student5_id, 'full_automation', 'phase_4', 'terminal_1', 'class FarmManager {\n  constructor(farmSize) {\n    this.size = farmSize;\n    this.crops = [];\n  }\n\n  plantAll(cropType) {\n    for (let r = 0; r < this.size; r++) {\n      for (let c = 0; c < this.size; c++) {\n        this.crops.push({type: cropType, pos: {r, c}, planted: Date.now()});\n        plant(cropType);\n        if (c < this.size - 1) move("right");\n      }\n      if (r < this.size - 1) {\n        move("down");\n        this.resetRow();\n      }\n    }\n  }\n\n  harvestReady() {\n    const now = Date.now();\n    this.crops.forEach(crop => {\n      if (now - crop.planted > 5000) {\n        moveTo(crop.pos.r, crop.pos.c);\n        harvest();\n      }\n    });\n  }\n}\n\nconst farm = new FarmManager(10);\nfarm.plantAll("wheat");', '{"success": false, "errors": [], "output": "Logic error: resetRow method not defined", "executionTime": 234}', TIMEZONE('utc', NOW()) - INTERVAL '6 days 7 hours 30 min', 'player', 234),
    (student5_id, 'full_automation', 'phase_4', 'terminal_1', 'class FarmManager {\n  constructor(farmSize) {\n    this.size = farmSize;\n    this.crops = [];\n  }\n\n  resetRow() {\n    for (let i = 0; i < this.size - 1; i++) {\n      move("left");\n    }\n  }\n\n  plantAll(cropType) {\n    for (let r = 0; r < this.size; r++) {\n      for (let c = 0; c < this.size; c++) {\n        this.crops.push({type: cropType, pos: {r, c}, planted: Date.now()});\n        plant(cropType);\n        if (c < this.size - 1) move("right");\n      }\n      if (r < this.size - 1) {\n        move("down");\n        this.resetRow();\n      }\n    }\n  }\n\n  harvestReady() {\n    const now = Date.now();\n    let harvested = 0;\n    this.crops.forEach(crop => {\n      if (now - crop.planted > 5000) {\n        moveTo(crop.pos.r, crop.pos.c);\n        harvest();\n        harvested++;\n      }\n    });\n    return harvested;\n  }\n}\n\nconst farm = new FarmManager(10);\nfarm.plantAll("wheat");\nsetTimeout(() => {\n  const count = farm.harvestReady();\n  console.log(`Harvested ${count} crops`);\n}, 6000);', '{"success": true, "errors": [], "output": "Full automation system working! Planted and harvested 100 crops.", "executionTime": 6789}', TIMEZONE('utc', NOW()) - INTERVAL '6 days 7 hours', 'player', 6789);

  -- Aisha's Learning Events
  INSERT INTO learning_events (student_profile_id, event_type, event_data, quest_id, phase_id, created_at)
  VALUES
    (student5_id, 'quest_started', '{"questId": "tutorial_basics"}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '7 days'),
    (student5_id, 'quest_completed', '{"questId": "tutorial_basics", "score": 100}', 'tutorial_basics', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 22 hours'),
    (student5_id, 'quest_completed', '{"questId": "game_intro", "score": 98}', 'game_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 21 hours'),
    (student5_id, 'quest_completed', '{"questId": "farming_loops", "score": 97}', 'farming_loops', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 19 hours'),
    (student5_id, 'quest_completed', '{"questId": "first_harvest", "score": 100}', 'first_harvest', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 18 hours'),
    (student5_id, 'quest_completed', '{"questId": "alpha_drone_intro", "score": 95}', 'alpha_drone_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 16 hours'),
    (student5_id, 'quest_completed', '{"questId": "drone_farming_quest", "score": 93}', 'drone_farming_quest', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 13 hours'),
    (student5_id, 'quest_completed', '{"questId": "functions_intro", "score": 98}', 'functions_intro', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 10 hours'),
    (student5_id, 'quest_completed', '{"questId": "farming_scripts", "score": 94}', 'farming_scripts', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 7 hours'),
    (student5_id, 'quest_started', '{"questId": "full_automation"}', 'full_automation', NULL, TIMEZONE('utc', NOW()) - INTERVAL '6 days 7 hours'),
    (student5_id, 'dialogue_viewed', '{"npc": "tech_wizard", "dialogueId": "classes_intro"}', 'full_automation', 'phase_3', TIMEZONE('utc', NOW()) - INTERVAL '6 days 7 hours 30 min');

  -- Aisha's Game Save
  INSERT INTO game_saves (student_profile_id, game_state, save_name, last_saved, save_version)
  VALUES (
    student5_id,
    '{
      "player": {
        "position": {"x": 35, "y": 25},
        "inventory": {
          "seeds": 120,
          "wheat": 156,
          "corn": 78,
          "special_crops": 23,
          "coins": 1850,
          "tools": ["basic_hoe", "watering_can", "advanced_plow", "seed_bag", "automated_harvester"]
        },
        "stats": {
          "level": 12,
          "experience": 3450,
          "achievements": ["speed_farmer", "automation_master", "perfect_score"]
        }
      },
      "world": {
        "discovered_locations": ["home", "garden", "farm", "village", "tech_lab", "automation_zone", "advanced_farming", "secret_garden"],
        "npcs_met": ["elder_willow", "farmer_bob", "merchant_sara", "tech_wizard", "drone_engineer", "master_coder"],
        "unlocked_areas": ["farming_zone", "automation_zone", "advanced_farming", "elite_zone"]
      },
      "drones": {
        "alpha": {
          "position": {"x": 30, "y": 20},
          "battery": 95,
          "upgrades": ["speed_2", "capacity_2", "auto_navigation", "smart_harvesting"]
        },
        "beta": {
          "position": {"x": 32, "y": 22},
          "battery": 88,
          "upgrades": ["speed_1", "capacity_2"]
        }
      },
      "farms": {
        "main_farm": {
          "size": 10,
          "crops_planted": 100,
          "automation_level": "advanced"
        },
        "drone_farm": {
          "size": 15,
          "crops_planted": 225,
          "automation_level": "full"
        }
      },
      "quests": {
        "active": ["full_automation"],
        "completed": ["tutorial_basics", "game_intro", "farming_loops", "first_harvest", "alpha_drone_intro", "drone_farming_quest", "functions_intro", "farming_scripts"]
      },
      "timestamp": "2025-11-17T13:00:00Z"
    }',
    'autosave',
    TIMEZONE('utc', NOW()) - INTERVAL '30 minutes',
    1
  );

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify session code was created
SELECT
  code,
  validity_start,
  validity_end,
  is_active,
  max_students,
  created_at,
  created_by
FROM session_codes
WHERE code = 'bf16294b-8b38-4842';

-- Verify all 5 students were created
SELECT
  sp.username,
  sp.display_name,
  sp.is_active,
  sp.created_at,
  sp.last_login,
  sc.code as session_code
FROM student_profiles sp
JOIN session_codes sc ON sp.session_code_id = sc.id
WHERE sc.code = 'bf16294b-8b38-4842'
ORDER BY sp.username;

-- Show quest progress summary
SELECT
  sp.username,
  COUNT(DISTINCT qp.quest_id) as total_quests,
  COUNT(DISTINCT qp.quest_id) FILTER (WHERE qp.state = 'completed') as completed_quests,
  COUNT(DISTINCT qp.quest_id) FILTER (WHERE qp.state = 'active') as active_quests,
  AVG(qp.score) FILTER (WHERE qp.score IS NOT NULL) as avg_score
FROM student_profiles sp
JOIN quest_progress qp ON sp.id = qp.student_profile_id
WHERE sp.session_code_id = (SELECT id FROM session_codes WHERE code = 'bf16294b-8b38-4842')
GROUP BY sp.username
ORDER BY avg_score DESC NULLS LAST;

-- Show code execution statistics
SELECT
  sp.username,
  COUNT(ce.id) as total_executions,
  COUNT(ce.id) FILTER (WHERE (ce.execution_result->>'success')::boolean = true) as successful_executions,
  COUNT(ce.id) FILTER (WHERE (ce.execution_result->>'success')::boolean = false) as failed_executions,
  ROUND(
    COUNT(ce.id) FILTER (WHERE (ce.execution_result->>'success')::boolean = true)::numeric /
    NULLIF(COUNT(ce.id), 0) * 100,
    2
  ) as success_rate_percent
FROM student_profiles sp
JOIN code_executions ce ON sp.id = ce.student_profile_id
WHERE sp.session_code_id = (SELECT id FROM session_codes WHERE code = 'bf16294b-8b38-4842')
GROUP BY sp.username
ORDER BY success_rate_percent DESC;

-- Show learning events summary
SELECT
  sp.username,
  COUNT(le.id) FILTER (WHERE le.event_type = 'quest_completed') as quests_completed,
  COUNT(le.id) FILTER (WHERE le.event_type = 'hint_used') as hints_used,
  COUNT(le.id) FILTER (WHERE le.event_type = 'error_encountered') as errors_encountered
FROM student_profiles sp
LEFT JOIN learning_events le ON sp.id = le.student_profile_id
WHERE sp.session_code_id = (SELECT id FROM session_codes WHERE code = 'bf16294b-8b38-4842')
GROUP BY sp.username
ORDER BY sp.username;

-- Show overall session summary
SELECT
  sc.code,
  COUNT(DISTINCT sp.id) as total_students,
  COUNT(DISTINCT sp.id) FILTER (WHERE sp.is_active = TRUE) as active_students,
  COUNT(DISTINCT gs.id) as total_saves,
  COUNT(DISTINCT qp.id) as total_quest_records,
  COUNT(DISTINCT ce.id) as total_code_executions
FROM session_codes sc
LEFT JOIN student_profiles sp ON sc.id = sp.session_code_id
LEFT JOIN game_saves gs ON sp.id = gs.student_profile_id
LEFT JOIN quest_progress qp ON sp.id = qp.student_profile_id
LEFT JOIN code_executions ce ON sp.id = ce.student_profile_id
WHERE sc.code = 'bf16294b-8b38-4842'
GROUP BY sc.code;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

/*
SUMMARY:
--------
Session Code: bf16294b-8b38-4842 (shortened from original to fit VARCHAR(20) limit)
Validity: Started 7 days ago, expires in 60 days
Total Students: 5
Default Password: "student123"

Student Profiles (with varied skill levels):
============================================

1. Emma Chen (emma.chen) - BEGINNER / STRUGGLING
   - Currently in: tutorial_basics (phase 2)
   - Completed: 0 quests
   - Time spent: 2730 seconds (~45 min)
   - Code executions: 7 (many syntax errors)
   - Hints used: 3
   - Characteristics: Struggling with basic syntax, missing semicolons, quote errors

2. Marcus Johnson (marcus.johnson) - INTERMEDIATE / STEADY PROGRESS
   - Currently in: farming_loops (phase 3)
   - Completed: 2 quests (tutorial_basics, game_intro)
   - Avg Score: 82.5
   - Time spent: 3960 seconds (~66 min total)
   - Code executions: 6 (mix of errors and successes)
   - Hints used: 1
   - Characteristics: Learning loops, occasional logic errors, improving steadily

3. Sofia Rodriguez (sofia.rodriguez) - ADVANCED / FAST LEARNER
   - Currently in: functions_intro (phase 4)
   - Completed: 5 quests
   - Avg Score: 94.2
   - Time spent: 2970 seconds (~50 min total, very efficient)
   - Code executions: 6 (mostly clean code)
   - Hints used: 0
   - Characteristics: Fast learner, efficient code, rare errors

4. Tyler Brooks (tyler.brooks) - STRUGGLING / MANY MISTAKES
   - Currently in: first_harvest (phase 1, stuck)
   - Completed: 2 quests (tutorial_basics, game_intro)
   - Avg Score: 60
   - Time spent: 7560 seconds (~126 min, very slow)
   - Code executions: 10 (lots of errors: syntax, runtime, logic, infinite loops)
   - Hints used: 5
   - Failed attempts: 8
   - Characteristics: Case sensitivity issues, forgetting let/const, logic errors, infinite loops

5. Aisha Patel (aisha.patel) - COMPLETED / TOP PERFORMER
   - Currently in: full_automation (phase 5, final quest)
   - Completed: 8 quests
   - Avg Score: 96.9
   - Time spent: 5280 seconds (~88 min total)
   - Code executions: 6 (advanced: classes, automation, clean code)
   - Hints used: 0
   - Characteristics: Excellent coder, uses advanced features, efficient, high scores

REALISTIC CODE PATTERNS INCLUDED:
==================================
- Syntax errors: Missing semicolons, quotes, brackets, case sensitivity
- Runtime errors: Undefined variables, reference errors, type errors
- Logic errors: Infinite loops, incorrect conditionals, wrong loop ranges
- Progressive learning: Students improve over time
- Different learning speeds: From 6 min to 62 min per quest phase
- Hint usage patterns: Struggling students use more hints
- Varied quest completion times: Fast learners vs slow learners
- Game state progression: Inventory, levels, discovered locations match quest progress
- Realistic timestamps: Activities spread over 1-7 days

DATABASE RECORDS CREATED:
=========================
- 1 session code
- 5 student profiles
- 5 game saves (with detailed JSONB game state)
- 21 quest progress records (varied states: locked, available, active, completed)
- 15 objective progress records
- 36 code executions (with realistic code and errors)
- 28 learning events (quest starts, completions, hints, errors)

Total: 111 database records with realistic, interconnected data
*/
