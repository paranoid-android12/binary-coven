# Global Student Accounts — Implementation Plan

## Problem Statement

Currently, student accounts are **per-session**: a student registering with the same username in different sessions creates completely separate accounts with different UUIDs and no shared identity. The desired behavior is **one-time registration** — a student registers once on the BinaryCoven domain and uses that same account across all sessions they attend.

---

## Current Architecture

### Schema
```
student_profiles
├── id (UUID PK)
├── username (VARCHAR)
├── password_hash (TEXT)
├── session_code_id (UUID FK → session_codes) ← tied to ONE session
├── display_name (VARCHAR)
├── email (VARCHAR)
├── created_at, last_login, is_active
└── UNIQUE(username, session_code_id) ← username only unique within session
```

### Login Flow
1. Student enters `sessionCode + email + username + password`
2. New user → OTP email verification → create `student_profiles` row with `session_code_id`
3. Returning user → verify password → login (only works for same session)

### Analytics (all tied to `student_profile_id`)
- `quest_progress` — quest completion per student profile
- `objective_progress` — objective details
- `code_executions` — code run history
- `learning_events` — analytics events
- `game_saves` — game state saves

---

## Proposed Architecture

### New Schema

#### 1. `student_profiles` (global student account)
```sql
student_profiles
├── id (UUID PK)
├── username (VARCHAR) ← UNIQUE (globally unique!)
├── password_hash (TEXT)
├── display_name (VARCHAR)
├── email (VARCHAR) ← UNIQUE (globally unique!)
├── created_at, last_login, is_active
├── UNIQUE(username)
└── UNIQUE(email)
```
- **Removed:** `session_code_id` column (moved to junction table)
- **Changed:** `UNIQUE(username, session_code_id)` → `UNIQUE(username)`
- **Added:** `UNIQUE(email)` — one email per student, one student per email

#### 2. NEW: `student_sessions` (junction table)
```sql
student_sessions
├── id (UUID PK)
├── student_profile_id (UUID FK → student_profiles)
├── session_code_id (UUID FK → session_codes)
├── joined_at (TIMESTAMP)
├── is_active (BOOLEAN DEFAULT TRUE)
├── current_session (BOOLEAN DEFAULT FALSE) ← tracks which session is "active"
└── UNIQUE(student_profile_id, session_code_id)
```

#### 3. Analytics tables — add `session_code_id` column
```sql
-- quest_progress, objective_progress, code_executions, learning_events, game_saves
ALTER TABLE quest_progress ADD COLUMN session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE objective_progress ADD COLUMN session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE code_executions ADD COLUMN session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE learning_events ADD COLUMN session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE game_saves ADD COLUMN session_code_id UUID REFERENCES session_codes(id);
```
This allows **per-session tracking** while the `student_profile_id` provides **global identity**.

### New Login Flow

The form **always** collects all 4 fields: `sessionCode + email + username + password`

Both `email` and `username` are **globally unique** — one email per student, one username per student.

```
Student enters: sessionCode + email + username + password
                    │
            Validate session code
                    │
            Look up account by email + username
                    │
    ┌───────────────┼───────────────────┐
    │               │                   │
  Account       Email exists but     Neither email nor
  found         username doesn't     username exist
  (email +      match (or vice       (brand new student)
  username      versa)                   │
  match)            │               Check email not taken
    │           Return error:       Check username not taken
    │           "Email/username          │
    │            mismatch"          ┌────┴────┐
    │                               │         │
  Verify                        Conflict   Both free
  password                      found      │
    │                           (email OR  → Send OTP
  ┌─┴──┐                       username     to email
  OK   Wrong                   already      │
  │    │                       taken)    → Verify OTP
  │  Error:                      │          │
  │  "Incorrect                Error:    → Create account
  │   password"               "Email/      (email + username
  │                            username     + password)
  │                            already      │
  │                            taken"    → Create
  │                                       student_sessions
  │                                       row
  Check student_sessions                    │
    │                                       │
  ┌─┴──┐                                   │
  Yes  No (new session)                     │
  │    │                                    │
  │  Auto-link to session                   │
  │  (add student_sessions row)             │
  │    │                                    │
  └─┬──┘                                   │
    │                                       │
  Set active session              Set active session
    │                                       │
    └───────────────┬───────────────────────┘
                    │
              Login complete
              (cookie: student_profile_id)
              (active session stored)
```

**Key rules:**
- `email` and `username` are each globally unique — no two accounts share either
- OTP is **only** triggered for a **brand new email** (never seen in the system)
- If the student already registered (same email + same username + same password), logging in with a **different session code** just auto-links them to the new session — **no OTP**
- The only thing that changes between logins is the **session code**

**Email handling:**
- Email is **always collected** on the login form — all 4 fields are required every time
- Both email and username must be unique across the entire system
- **First registration (new student):** email is brand new → OTP sent to verify → account created
- **Existing student, new session:** same email + username + password, different session code → password verified → auto-linked to new session, **no OTP**
- **Email mismatch:** student enters a username that belongs to a different email (or vice versa) → error
- Email is also used for password reset across all sessions

---

## Decision: Quest Progress Scope

**Question:** Should quest progress be per-session or global?

### Option A: Per-Session (Recommended)
- Student can redo same quests in different sessions
- Like a student taking the same course/class again
- Data from Session A doesn't affect Session B
- Admin sees per-session analytics
- Requires `session_code_id` on all analytics tables

### Option B: Global
- Once a quest is completed, it's completed forever
- Simpler queries but less flexibility
- Admin can't distinguish which session the progress came from

**Recommendation:** Per-session, because:
- Teachers may run the same quests in multiple classes
- Students retaking a session should start fresh
- Per-session data is more useful for teacher analytics

---

## Migration Strategy

### SQL Migration File: `004_global_student_accounts.sql`

```sql
-- Step 1: Create student_sessions junction table
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  session_code_id UUID NOT NULL REFERENCES session_codes(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(student_profile_id, session_code_id)
);

-- Step 2: Populate student_sessions from existing data
INSERT INTO student_sessions (student_profile_id, session_code_id, joined_at)
SELECT id, session_code_id, created_at
FROM student_profiles
WHERE session_code_id IS NOT NULL;

-- Step 3: Add session_code_id to analytics tables (for per-session tracking)
ALTER TABLE quest_progress ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE objective_progress ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE code_executions ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS session_code_id UUID REFERENCES session_codes(id);

-- Step 4: Backfill session_code_id on analytics tables
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

-- Step 5: Handle duplicate usernames across sessions
-- Merge accounts with same username: keep the oldest, update FKs
-- (This needs careful handling — see "Data Migration" section below)

-- Step 6: Drop old composite unique, add global unique
-- (Only after duplicate resolution)
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_username_session_code_id_key;
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_username_unique UNIQUE (username);
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_email_unique UNIQUE (email);

-- Step 7: Drop session_code_id from student_profiles (now in junction table)
-- Keep as nullable for backward compatibility during transition
-- ALTER TABLE student_profiles DROP COLUMN session_code_id;
-- ^ Do this in a LATER migration after all code is updated

-- Step 8: Indexes
CREATE INDEX idx_student_sessions_student ON student_sessions(student_profile_id);
CREATE INDEX idx_student_sessions_session ON student_sessions(session_code_id);
CREATE INDEX idx_quest_progress_session ON quest_progress(session_code_id);
CREATE INDEX idx_code_executions_session ON code_executions(session_code_id);

-- Step 9: RLS policies for student_sessions
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view their own sessions" ON student_sessions
  FOR SELECT USING (student_profile_id::text = auth.uid()::text);
```

### Data Migration: Handling Duplicate Usernames & Emails

If the same username OR same email exists in multiple sessions, we need to:
1. Pick one profile as the "primary" (oldest)
2. Re-point all analytics FKs from duplicate profiles to the primary
3. Delete duplicate profiles
4. Create `student_sessions` rows for all sessions the username appeared in

```sql
-- Identify duplicate usernames
SELECT username, COUNT(*) as profile_count, array_agg(id) as profile_ids
FROM student_profiles
GROUP BY username
HAVING COUNT(*) > 1;

-- Identify duplicate emails
SELECT email, COUNT(*) as profile_count, array_agg(id) as profile_ids
FROM student_profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

**If no duplicates exist (clean slate):** Skip this step entirely.

---

## File Changes

### Backend (API Routes)

| File | Change | Complexity |
|------|--------|------------|
| `supabase/migrations/004_global_student_accounts.sql` | New migration | Medium |
| `src/types/database.ts` | Add `student_sessions` type, update `student_profiles` | Low |
| `src/pages/api/auth/student-login.ts` | Rewrite: global lookup + **email verification** + session linking | High |
| `src/pages/api/auth/verify-otp-and-register.ts` | Rewrite: global account creation + session linking | High |
| `src/pages/api/auth/session.ts` | Add active session to response | Medium |
| `src/pages/api/analytics/quest-progress.ts` | Add session_code_id to inserts | Low |
| `src/pages/api/analytics/objective-progress.ts` | Add session_code_id to inserts | Low |
| `src/pages/api/analytics/code-execution.ts` | Add session_code_id to inserts | Low |
| `src/pages/api/analytics/student/[id].ts` | Session-aware queries | Medium |
| `src/services/analyticsService.ts` | Pass session context | Low |
| `src/services/gameStateService.ts` | Session-aware saves | Low |

### Frontend

| File | Change | Complexity |
|------|--------|------------|
| `src/contexts/UserContext.tsx` | Add `sessionCodeId` + `sessions` to user type | Low |
| `src/components/LoginModal.tsx` | Handle "account exists in different session" flow | Medium |
| `src/pages/student-login.tsx` | Same as LoginModal | Medium |
| `src/components/StudentProgressModal.tsx` | Session-aware data fetching | Medium |
| `src/components/GameInterface.tsx` | No change (uses UserContext) | None |

### Admin

| File | Change | Complexity |
|------|--------|------------|
| `src/pages/admin/students.tsx` | Show which sessions a student belongs to | Low |
| `src/pages/admin/students/[id].tsx` | Session selector for analytics | Medium |
| `src/pages/admin/sessions/[code]/students.tsx` | Use junction table | Low |

---

## Implementation Order

1. **SQL Migration** — create `student_sessions`, add `session_code_id` to analytics, handle duplicates
2. **TypeScript types** — update `database.ts`
3. **Auth APIs** — rewrite login + registration
4. **Session API** — update session check
5. **Analytics APIs** — add session context
6. **Frontend auth** — update UserContext, LoginModal
7. **Frontend data** — update StudentProgressModal, admin views
8. **Testing** — verify login flow, registration, session switching, data isolation

---

## Open Questions

1. **Should `session_code_id` be removed from `student_profiles`?**
   - Recommended: Keep as nullable during transition, remove in later migration
   - The junction table `student_sessions` becomes the source of truth

2. **How does session switching work in-game?**
   - Student logs in with a session code → that becomes their active session
   - Game loads quests for that session
   - Previous session data remains but is not visible during current session

3. **Should password be updatable across sessions?**
   - Yes — single account, single password

4. **What if a student forgets which session code to use?**
   - Could show their session history on the login page
   - Or admin can look it up
