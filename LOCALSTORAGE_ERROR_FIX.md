# LocalStorage Error Fix - QuestManager.loadProgressFromStorage

## Error Description

**Error**: `TypeError: Cannot read properties of undefined (reading 'map')`

**Location**: `QuestManager.loadProgressFromStorage` at line 729

**Cause**: When localStorage is cleared (either manually or during logout), the QuestManager tries to load quest progress from localStorage but encounters malformed or missing data structures.

## Root Cause Analysis

The error occurred in this code:
```typescript
const progressData = JSON.parse(storedData);
this.questProgress = new Map(
  progressData.questProgress.map((progressItem: any) => [  // ❌ Error here
    // ...
  ])
);
```

**Problem**: `progressData.questProgress` was `undefined`, causing `.map()` to fail.

**Why it happened**:
1. When localStorage is cleared, some code might write partial/incomplete data
2. QuestManager didn't validate the structure before accessing nested properties
3. No defensive checks for malformed localStorage data

## Fix Implementation

### 1. **Enhanced QuestManager.loadProgressFromStorage()** ✅

Added comprehensive validation and error handling:

```typescript
// Validate that progressData has the expected structure
if (!progressData || typeof progressData !== 'object') {
  console.warn('[QuestManager] Invalid progress data structure, skipping load');
  return;
}

// Restore quest progress (with validation)
if (Array.isArray(progressData.questProgress)) {
  this.questProgress = new Map(
    progressData.questProgress.map((progressItem: any) => [
      // ... safe to map now
    ])
  );
} else {
  console.log('[QuestManager] No quest progress array found, starting fresh');
  this.questProgress = new Map();
}
```

**Changes**:
- ✅ Validate `progressData` is an object
- ✅ Check if `progressData.questProgress` is an array before mapping
- ✅ Validate nested `phaseProgress` is an array
- ✅ Provide fallback to empty Map/Set if data is invalid
- ✅ Initialize empty state in catch block

### 2. **Enhanced localStorageManager.loadAndSyncGameState()** ✅

Ensured correct data structure when syncing from database:

```typescript
// QuestManager expects a specific format with questProgress, unlockedQuests, etc.
if (data.gameState.questProgress && typeof data.gameState.questProgress === 'object') {
  const questProgressData = data.gameState.questProgress.questProgress
    ? data.gameState.questProgress
    : {
        questProgress: [],
        unlockedQuests: [],
        activeQuestId: undefined,
        currentPhaseIndex: 0
      };

  localStorage.setItem(
    LOCAL_STORAGE_KEYS.QUEST_PROGRESS,
    JSON.stringify(questProgressData)
  );
}
```

**Changes**:
- ✅ Validate quest progress exists and is an object
- ✅ Ensure proper structure with all required fields
- ✅ Provide default empty structure if needed

### 3. **Added validateAndRepairLocalStorage()** ✅

New utility function to validate and repair localStorage on app startup:

```typescript
export function validateAndRepairLocalStorage(): void {
  // Validate quest progress structure
  const questProgressRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.QUEST_PROGRESS);
  if (questProgressRaw) {
    const questProgress = JSON.parse(questProgressRaw);

    // Check structure and repair if needed
    if (!Array.isArray(questProgress.questProgress)) {
      const repairedData = {
        questProgress: [],
        unlockedQuests: [],
        activeQuestId: undefined,
        currentPhaseIndex: 0
      };
      localStorage.setItem(LOCAL_STORAGE_KEYS.QUEST_PROGRESS, JSON.stringify(repairedData));
    }
  }
  // ... also validates game save structure
}
```

**Called on app startup** in `UserContext.tsx`:
```typescript
useEffect(() => {
  // Validate and repair localStorage on app startup
  validateAndRepairLocalStorage();

  // Then check session
  checkSession();
}, []);
```

## Expected Quest Progress Structure

QuestManager expects this localStorage structure:

```typescript
{
  questProgress: [
    {
      questId: string,
      state: QuestState,
      startedAt: number,
      currentPhaseIndex: number,
      phaseProgress: [
        {
          phaseId: string,
          startedAt: number,
          objectivesCompleted: number[],
          dialogueIndex: number,
          hintsUsed: number
        }
      ],
      attempts: number
    }
  ],
  unlockedQuests: string[],
  activeQuestId?: string,
  currentPhaseIndex: number
}
```

## Files Modified

1. **`src/game/systems/QuestManager.ts`**
   - Enhanced `loadProgressFromStorage()` with validation
   - Added defensive checks for all array operations
   - Initialize empty state on error

2. **`src/utils/localStorageManager.ts`**
   - Enhanced `loadAndSyncGameState()` to ensure correct structure
   - Added `validateAndRepairLocalStorage()` utility function
   - Validates and repairs localStorage on startup

3. **`src/contexts/UserContext.tsx`**
   - Call `validateAndRepairLocalStorage()` on app mount
   - Ensures clean state before session check

## Testing

### Before Fix
```
❌ Error on page load after localStorage clear
❌ "Cannot read properties of undefined (reading 'map')"
❌ App crashes, requires browser console to ignore
```

### After Fix
```
✅ Validates localStorage on startup
✅ Repairs malformed data automatically
✅ Gracefully handles missing/invalid data
✅ Logs clear warnings when data is invalid
✅ Initializes with empty state if needed
```

### Test Cases

1. **Fresh Install** (no localStorage)
   ```
   Expected: No errors, clean initialization
   Console: "[QuestManager] No saved progress found"
   ```

2. **After Logout** (localStorage cleared)
   ```
   Expected: No errors, validates/repairs on startup
   Console: "[LocalStorageManager] Validating localStorage data..."
   ```

3. **Malformed Data** (corrupted localStorage)
   ```
   Expected: Data repaired or cleared, no crash
   Console: "[LocalStorageManager] Quest progress missing questProgress array, repairing..."
   ```

4. **Normal Operation** (valid localStorage)
   ```
   Expected: Data loads normally
   Console: "[QuestManager] Progress loaded from storage"
   ```

## Prevention Measures

### On Startup
1. ✅ Validate localStorage structure
2. ✅ Repair malformed data
3. ✅ Clear invalid data
4. ✅ Log all operations

### On Load
1. ✅ Check if data exists before parsing
2. ✅ Validate data is an object
3. ✅ Check arrays before mapping
4. ✅ Provide fallbacks for missing data

### On Sync
1. ✅ Ensure correct structure when writing
2. ✅ Validate before storing
3. ✅ Log sync operations

## Console Messages

**Normal startup with valid data**:
```
[LocalStorageManager] Validating localStorage data...
[LocalStorageManager] Validation complete
[QuestManager] Progress loaded from storage
```

**Startup with malformed data**:
```
[LocalStorageManager] Validating localStorage data...
[LocalStorageManager] Quest progress missing questProgress array, repairing...
[LocalStorageManager] Quest progress repaired
[LocalStorageManager] Validation complete
[QuestManager] No quest progress array found, starting fresh
```

**Fresh install**:
```
[LocalStorageManager] Validating localStorage data...
[LocalStorageManager] Validation complete
[QuestManager] No saved progress found
```

## Rollback

If issues persist, rollback by reverting:
```bash
git checkout HEAD~1 src/game/systems/QuestManager.ts
git checkout HEAD~1 src/utils/localStorageManager.ts
git checkout HEAD~1 src/contexts/UserContext.tsx
```

## Future Improvements

1. **Schema Versioning**
   - Add version number to localStorage data
   - Migrate between schema versions automatically

2. **Data Validation Library**
   - Use Zod or similar for runtime validation
   - Ensure type safety beyond TypeScript compile time

3. **Recovery Mode**
   - Detect repeated failures
   - Offer user option to reset all data

4. **Better Error Reporting**
   - Send malformed data to error tracking
   - Help identify patterns in data corruption

## Summary

The error was caused by QuestManager trying to access nested properties without validation. The fix adds:

✅ **Defensive validation** at multiple levels
✅ **Data structure repair** on startup
✅ **Graceful fallbacks** for missing data
✅ **Comprehensive logging** for debugging
✅ **Error recovery** instead of crashes

The app now handles localStorage issues gracefully and won't crash even with corrupted data.
