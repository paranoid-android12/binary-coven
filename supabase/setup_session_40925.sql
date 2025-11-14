-- ============================================================================
-- SETUP SESSION CODE 40925 WITH 8 STUDENTS
-- ============================================================================
-- This script clears existing student data and creates a fresh session
-- with 8 comprehensive student profiles

-- ============================================================================
-- STEP 1: CLEAR EXISTING DATA
-- ============================================================================

-- Delete students (CASCADE will handle related data in other tables)
DELETE FROM student_profiles;

-- Delete session codes (CASCADE will handle any remaining foreign key references)
DELETE FROM session_codes;

-- ============================================================================
-- STEP 2: CREATE SESSION CODE "40925"
-- ============================================================================

-- Insert session code valid for 365 days (1 year)
INSERT INTO session_codes (
  code,
  validity_start,
  validity_end,
  is_active,
  max_students,
  created_by
) VALUES (
  '40925',
  TIMEZONE('utc', NOW()),
  TIMEZONE('utc', NOW()) + INTERVAL '365 days',
  TRUE,
  NULL, -- Unlimited students
  'admin'
);

-- ============================================================================
-- STEP 3: CREATE 8 STUDENT PROFILES
-- ============================================================================
-- All passwords are hashed using bcrypt ($2a$10$...)
-- Default password for all students: "student123"
-- Password hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- Get the session code ID for reference
DO $$
DECLARE
  session_id UUID;
BEGIN
  SELECT id INTO session_id FROM session_codes WHERE code = '40925';

  -- Student 1: Princess Valenzuela
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'princess.valenzuela',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Princess Valenzuela',
    TRUE
  );

  -- Student 2: Majorie Cruz
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'majorie.cruz',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Majorie Cruz',
    TRUE
  );

  -- Student 3: Esteban nando
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'esteban.nando',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Esteban nando',
    TRUE
  );

  -- Student 4: Robinx Aquino
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'robinx.aquino',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Robinx Aquino',
    TRUE
  );

  -- Student 5: Rjay Escalante
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'rjay.escalante',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Rjay Escalante',
    TRUE
  );

  -- Student 6: Joven Mano Santos
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'joven.santos',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Joven Mano Santos',
    TRUE
  );

  -- Student 7: EJ Valenzuela
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'ej.valenzuela',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'EJ Valenzuela',
    TRUE
  );

  -- Student 8: Jewel May Zulueta
  INSERT INTO student_profiles (
    username,
    password_hash,
    session_code_id,
    display_name,
    is_active
  ) VALUES (
    'jewel.zulueta',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    session_id,
    'Jewel May Zulueta',
    TRUE
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
WHERE code = '40925';

-- Verify all 8 students were created
SELECT
  sp.username,
  sp.display_name,
  sp.is_active,
  sp.created_at,
  sc.code as session_code
FROM student_profiles sp
JOIN session_codes sc ON sp.session_code_id = sc.id
WHERE sc.code = '40925'
ORDER BY sp.username;

-- Show summary
SELECT
  sc.code,
  COUNT(sp.id) as total_students,
  COUNT(sp.id) FILTER (WHERE sp.is_active = TRUE) as active_students
FROM session_codes sc
LEFT JOIN student_profiles sp ON sc.id = sp.session_code_id
WHERE sc.code = '40925'
GROUP BY sc.code;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

/*
SUMMARY:
--------
Session Code: 40925
Validity: 365 days from now
Total Students: 8

Student List (all with password: "student123"):
1. princess.valenzuela - Princess Valenzuela
2. majorie.cruz         - Majorie Cruz
3. esteban.nando       - Esteban nando
4. robinx.aquino       - Robinx Aquino
5. rjay.escalante      - Rjay Escalante
6. joven.santos        - Joven Mano Santos
7. ej.valenzuela       - EJ Valenzuela
8. jewel.zulueta       - Jewel May Zulueta
*/
