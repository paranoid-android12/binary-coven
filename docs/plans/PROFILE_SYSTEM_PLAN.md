# Student Profile & Statistics System — Implementation Plan

## Database Findings

The schema shows `student_profiles` has `UNIQUE(username, session_code_id)` with the comment: *"one student can have multiple profiles"*. This means:

- A student logging in with the same username in **different sessions** creates **separate profiles** (different UUIDs, no shared identity)
- There's **no cross-session identity** — you can't track "session history" for a person without new schema work
- All analytics (`quest_progress`, `code_executions`, etc.) are tied to a `student_profile_id` which is session-specific

### For session history to work (future):
- A `student_identity` table that groups profiles by some shared key (e.g., email, or a "real name" field), OR
- Track it by matching usernames across sessions (fragile but simple)

**Recommendation:** For now, skip cross-session history and focus on single-session data that already exists. Session history can be added later with a schema migration.

---

## Current System

### Student Side (in-game `StudentProgressModal` — "My Progress" button):
- 3 tabs: **Progress**, **Learning Insights**, **Class Statistics**
- No "profile" concept — just raw quest/stat data
- No session history, no cross-session aggregation
- Can click classmates in Class tab to see their detailed stats

### Admin Side (`/admin/students/[id]`):
- Profile card (username, display name, session, join date, last active)
- Summary stats: quests completed, quests active, total time, code runs, last save
- 5 tabs: **Overview**, **Quests**, **Objectives**, **Code**, **Game State**
- `/admin/students` — list all students, searchable
- `/admin/sessions/[code]/students` — students in a session

---

## Implementation Phases

### Phase 1: Student-Side "Profile" Tab (in-game modal)

**File:** `src/components/StudentProgressModal.tsx`

**Changes:**
- Add new tab type: `'profile' | 'progress' | 'insights' | 'class'`
- Make **Profile** the default/first tab
- Profile tab contents:
  - Avatar circle (first letter of username, styled like admin)
  - Display name + username
  - Session code + join date
  - **Summary stats cards**: Quests completed, total time, code runs, success rate
  - **Mastery tags**: Colored pill badges showing topics mastered (e.g., "Control Flow ✓", "Functions ✓", "Automation ✓") — computed client-side from completed quest concepts
  - **Performance bar chart**: Visual of proficiency per topic based on success rate + completion time

### Phase 2: Enhanced "Learning Insights" Tab

**File:** `src/components/StudentProgressModal.tsx`

**Changes:**
- Keep existing topic mastery breakdown
- Add per-topic stats: success rate (successful code runs / total), average time per quest, hints used
- Topic proficiency scoring (computed from: quest completion %, success rate, time efficiency)

### Phase 3: Admin-Side Profile Enhancement

**File:** `src/pages/admin/students/[id].tsx`

**Changes:**
- Add mastery tags to the student info card (same pill badges as student-side)
- Add a "Profile" overview tab that matches the student-side format
- Computed from the same quest/execution data already fetched

### Phase 4: Explore Page (Student & Admin)

A dedicated page for browsing and searching any student account across all session-registered profiles.

#### Student Side — In-Game Explore

**File:** `src/components/ExploreModal.tsx` (NEW) or new tab inside `StudentProgressModal.tsx`

**Trigger:** "Explore" button in the game UI (alongside existing "My Progress" button)

**Features:**
- **Search bar** — search any student by username or display name (across all sessions the searcher's session code covers, or globally if desired)
- **Student cards** — grid/list of results showing: avatar (first letter), username, display name, session code, mastery tags preview
- **Click to view** — opens a read-only profile view with the same 4 tabs:
  - **Profile** — avatar, display name, username, session, join date, summary stats, mastery tags
  - **Progress** — quest completion details (read-only)
  - **Learning Insights** — topic proficiency, per-topic stats (read-only)
  - **Class Statistics** — their session's leaderboard context
- **Scope:** Students can browse all registered accounts globally (not restricted to their own session)

#### Admin Side — Enhanced Students List

**File:** `src/pages/admin/students.tsx`

**Changes:**
- Enhance existing student list with:
  - Search by username/display name
  - Filter by session code
  - Quick stats preview (quests completed, mastery tags) in the list view
  - Click through to full profile (`/admin/students/[id]`)
- Admin can browse **all students across all sessions** (no scope restrictions)
- Same 4-tab profile view when clicking into a student

#### API Support

**File:** `src/pages/api/students/search.ts` (NEW)

- `GET /api/students/search?q=...&sessionCode=...`
- Returns paginated list of matching student profiles with summary stats
- Global scope for both students and admins (all registered accounts searchable)
- Optional `sessionCode` filter param to narrow results

---

## Mastery Tag Computation

**Approach:** Client-side computation (recommended)

**Rationale:**
- The concept → topic mapping already exists in `StudentProgressModal.tsx` (`conceptToTopic` object)
- No schema migration needed
- Updates in real-time as quests are completed
- Small data set (10 quests max per session)

**Logic:**
1. Each quest has `concepts` (e.g., `['loops', 'functions', 'automation']`)
2. Concepts map to broader topics via existing `conceptToTopic` mapping:
   - Control Flow, Functions, Automation, Basic Programming, Applied Programming
3. A topic is **"mastered"** when all quests covering that topic are completed
4. Proficiency level per topic = `(completed quests in topic / total quests in topic)` × weight from success rate
5. Tags are color-coded: mastered (green), in-progress (yellow), not started (gray)

**Shared utility file:** `src/utils/masteryComputation.ts`

---

## Tab Structure (Student Modal - Final)

| Tab | Purpose | Status |
|-----|---------|--------|
| **Profile** | General student profile, performance stats, mastery tags | **NEW** |
| **Progress** | Quest completion details, game-focused | Existing (keep as-is) |
| **Learning Insights** | Aggregated stats, topic proficiency, per-topic details | Enhanced |
| **Class Statistics** | Session leaderboard, classmate comparison | Existing (keep as-is) |

---

## File Changes Summary

| File | Lines | Change Type |
|------|-------|-------------|
| `src/components/StudentProgressModal.tsx` | ~2000 | Add Profile tab, enhance Insights |
| `src/components/ExploreModal.tsx` | NEW | Student-side explore/browse UI |
| `src/pages/admin/students/[id].tsx` | ~360 | Add mastery tags, profile format |
| `src/pages/admin/students.tsx` | ~400 | Enhance search/filter/preview |
| `src/pages/api/students/search.ts` | NEW | Search API for explore feature |
| `src/utils/masteryComputation.ts` | NEW | Shared mastery tag logic |

---

## NOT Included (Future Work)

- **Cross-session history** — needs schema migration (`student_identity` table)
- **Server-side mastery caching** — not needed with small dataset
