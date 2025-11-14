# LocalStorage State Synchronization Fix

## Problem Statement

Students were experiencing localStorage persistence issues when switching between accounts:

1. **New Account Login**: Tutorial wouldn't trigger because old localStorage had `hasSeenTutorial: true`
2. **Existing Account Login**: Database state wasn't loaded to localStorage, causing state desync
3. **Logout**: localStorage wasn't cleared, causing data leakage between accounts

## Solution Overview

Implemented a centralized localStorage management system with three key features:

### 1. **Logout Enhancement** ✅
- Clears ALL game-related localStorage on logout
- Prevents state leakage between accounts
- Logs state before/after for debugging

### 2. **Login Enhancement** ✅
- Clears localStorage BEFORE login (fresh slate for every login)
- Loads database state AFTER successful login
- Syncs database → localStorage automatically
- Handles both new and existing accounts properly

### 3. **Centralized State Manager** ✅
- New utility: `src/utils/localStorageManager.ts`
- Manages all localStorage keys in one place
- Provides debugging utilities

## Implementation Details

### Files Modified

#### 1. `/src/utils/localStorageManager.ts` (NEW)
Central utility for localStorage management with:
- `clearAllGameState()` - Clears all game localStorage
- `loadAndSyncGameState(studentId)` - Loads DB state → localStorage
- `logLocalStorageState()` - Debug helper
- `LOCAL_STORAGE_KEYS` - Centralized key definitions

#### 2. `/src/contexts/UserContext.tsx`
**Modified `logout()` function:**
```typescript
// Before logout
logLocalStorageState();

// Clear all game localStorage
clearAllGameState();

// Then proceed with API call
await fetch('/api/auth/logout', { method: 'POST' });
```

#### 3. `/src/components/LoginModal.tsx`
**Modified `handleSubmit()` function:**
```typescript
// STEP 1: Clear localStorage BEFORE login
clearAllGameState();

// STEP 2: Perform login
const response = await fetch('/api/auth/student-login', {...});

// STEP 3: Load and sync DB state
await loadAndSyncGameState(studentId);

// STEP 4: Update user context
login(data.student, 'student');
```

### LocalStorage Keys Managed

| Key | Description | Source Component |
|-----|-------------|------------------|
| `binary-coven-save` | Main game save data | GameStateService |
| `binary-coven-save-backup` | Backup game save | GameStateService |
| `hasSeenTutorial` | Tutorial completion flag | GameInterface |
| `quest_progress` | Quest system state | QuestManager |

### Database ↔ LocalStorage Mapping

| Database Field | LocalStorage Key | Sync Direction |
|---------------|------------------|----------------|
| `game_saves.game_state` | `binary-coven-save` | DB → localStorage on login |
| `game_state.questProgress` | `quest_progress` | DB → localStorage on login |
| N/A (computed) | `hasSeenTutorial` | Derived from game progress |

## Testing Instructions

### Test Case 1: New Student Account
**Expected Behavior**: Tutorial should trigger, no old data present

1. Logout if currently logged in
2. Login with a NEW username/session code
3. Open browser console, check logs:
   ```
   [LoginModal] Clearing existing localStorage state...
   [LocalStorageManager] Cleared: binary-coven-save
   [LocalStorageManager] Cleared: hasSeenTutorial
   [LocalStorageManager] Cleared: quest_progress
   [LocalStorageManager] No existing save found - new player
   [LocalStorageManager] Cleared tutorial flag for new player
   ```
4. Verify tutorial triggers automatically
5. Complete some progress, then save game

### Test Case 2: Existing Student Account
**Expected Behavior**: Previous progress loaded from database

1. Logout (check console for localStorage clearing)
2. Login with EXISTING username that has progress
3. Open browser console, check logs:
   ```
   [LoginModal] Clearing existing localStorage state...
   [LocalStorageManager] Game save found in database
   [LocalStorageManager] Synced game state to localStorage
   [LocalStorageManager] Synced quest progress to localStorage
   [LocalStorageManager] Player has progress, marking tutorial as seen
   ```
4. Verify previous progress is restored (wheat count, quest progress, etc.)
5. Verify tutorial does NOT trigger again

### Test Case 3: Switching Between Accounts
**Expected Behavior**: No data leakage, each account isolated

1. Login as Student A (with progress)
2. Complete some quests, collect wheat
3. Logout (verify console shows localStorage clearing)
4. Login as Student B (new account)
5. Verify Student B has NO progress from Student A
6. Verify tutorial triggers for Student B
7. Switch back to Student A
8. Verify Student A's progress is intact

### Test Case 4: Logout State Cleanup
**Expected Behavior**: All localStorage cleared on logout

1. Login and create some progress
2. Open browser DevTools → Application → Local Storage
3. Verify keys exist: `binary-coven-save`, `hasSeenTutorial`, `quest_progress`
4. Click Logout button
5. Check console for:
   ```
   [UserContext] Logging out...
   [LocalStorageManager] Current localStorage state:
     GAME_SAVE: ✓ Present
     HAS_SEEN_TUTORIAL: ✓ Present
     QUEST_PROGRESS: ✓ Present
   [LocalStorageManager] Cleared: binary-coven-save
   [LocalStorageManager] Cleared: binary-coven-save-backup
   [LocalStorageManager] Cleared: hasSeenTutorial
   [LocalStorageManager] Cleared: quest_progress
   ```
6. Check DevTools → Local Storage → Verify all game keys are gone

### Test Case 5: Database Sync
**Expected Behavior**: Database state properly restored

1. Login as Student A
2. Complete tutorial and first quest
3. Save game (manually or wait for autosave)
4. Note wheat count and quest progress
5. Close browser completely
6. Open browser and login as Student A again
7. Verify:
   - Wheat count matches
   - Quest progress matches
   - Tutorial doesn't retrigger
   - Code windows restored

## Debugging

### Console Logs to Watch

All localStorage operations are logged with prefixes:
- `[LocalStorageManager]` - Storage operations
- `[LoginModal]` - Login flow
- `[UserContext]` - Logout flow

### Manual Inspection

Check localStorage in browser DevTools:
```javascript
// Application → Local Storage → localhost

// Check if keys exist
localStorage.getItem('hasSeenTutorial')
localStorage.getItem('quest_progress')
localStorage.getItem('binary-coven-save')

// Clear manually if needed (for testing)
localStorage.clear()
```

### Common Issues

**Problem**: Tutorial still not triggering for new account
- **Check**: Ensure `hasSeenTutorial` is not in localStorage
- **Fix**: Manually clear: `localStorage.removeItem('hasSeenTutorial')`

**Problem**: Old progress showing on new account
- **Check**: Console logs for localStorage clearing
- **Check**: Database for incorrect student_profile_id
- **Fix**: Verify clearAllGameState() is called before login

**Problem**: Database state not loading
- **Check**: Network tab for `/api/game/load` request
- **Check**: Response has `saveExists: true` and `gameState` object
- **Fix**: Verify student has a game save in database

## Future Improvements

1. **Add questProgress to Database**
   - Currently quest progress only stored in localStorage
   - Should be part of `game_state` object in database
   - Update save/load API to include quest progress explicitly

2. **Add hasSeenTutorial to Database**
   - Currently computed from game progress
   - Could be explicit field in `student_profiles` table

3. **Migration Script**
   - Create script to migrate localStorage data to database for existing users
   - Handle edge cases where localStorage exists but no DB save

4. **State Validation**
   - Add validation to ensure localStorage matches database state
   - Auto-repair on mismatch detection

5. **Offline Support**
   - Handle cases where database is unreachable
   - Queue saves for later sync

## Technical Notes

### State Management Flow

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ├─ Clear localStorage (fresh slate)
       │
       ├─ Authenticate with API
       │
       ├─ Load game_state from DB
       │     ├─ game_state.grids → localStorage
       │     ├─ game_state.entities → localStorage
       │     ├─ game_state.questProgress → localStorage
       │     └─ Compute hasSeenTutorial from progress
       │
       └─ Update UserContext
```

```
┌─────────────┐
│   Logout    │
└──────┬──────┘
       │
       ├─ Clear ALL localStorage keys
       │
       ├─ Clear session cookies
       │
       └─ Redirect to login
```

### Why Clear BEFORE Login?

Clearing localStorage **before** login (not after) ensures:
1. No race conditions with game initialization
2. Clean slate regardless of login success/failure
3. Prevents stale data from affecting new session
4. Easier to debug (single clear point)

### Why Not Store Everything in Database?

Current hybrid approach:
- **Database**: Source of truth for game state
- **LocalStorage**: Performance cache + offline capability

This provides:
- Fast game loading (localStorage cache)
- Persistence across devices (database)
- Offline play support (localStorage fallback)

## Rollback Instructions

If issues occur, rollback by reverting these files:
1. Remove: `src/utils/localStorageManager.ts`
2. Revert: `src/contexts/UserContext.tsx`
3. Revert: `src/components/LoginModal.tsx`

Or use git:
```bash
git checkout HEAD~1 src/utils/localStorageManager.ts
git checkout HEAD~1 src/contexts/UserContext.tsx
git checkout HEAD~1 src/components/LoginModal.tsx
```

## Summary

This fix ensures proper localStorage management across the student login lifecycle:

✅ **Logout**: Clears ALL localStorage (no data leakage)
✅ **New Account Login**: Fresh state, tutorial triggers
✅ **Existing Account Login**: Database state loaded and synced
✅ **Account Switching**: Proper isolation between accounts
✅ **Debugging**: Comprehensive logging for troubleshooting

The implementation is centralized, maintainable, and includes extensive logging for debugging.
