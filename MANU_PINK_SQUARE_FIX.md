# Manu Pink Square Fix - Troubleshooting Guide

## The Problem
Manu is showing as a pink square instead of her animated sprite.

## What the Pink Square Means
The pink square (`#ff6b9d`) is a **placeholder sprite** created by the NPCManager when it can't find the `manu_idle` texture. This happens when:

1. The texture isn't loaded properly
2. The texture name doesn't match
3. The file path is incorrect

## Debugging Steps

### Step 1: Check Console Output
After refreshing your game, look for these console messages:

**Expected (Good):**
```
[PRELOADER] Queued manu_idle spritesheet for loading
[PRELOADER] File loaded: manu_idle
[PRELOADER] Applied NEAREST filter to: manu_idle
[PRELOADER] manu_idle exists? true
[PRELOADER] manu_idle animation exists? true
[NPC-MANAGER] Checking texture 'manu_idle' exists: true
[NPC-MANAGER] Creating sprite with texture 'manu_idle'
[NPC-MANAGER] Playing animation: manu_idle
```

**Problem (Bad):**
```
[NPC-MANAGER] Checking texture 'manu_idle' exists: false
[NPC-MANAGER] Available textures: ["qubit_walk", "qubit_idle", ...]
[NPC-MANAGER] Sprite texture 'manu_idle' not found. Creating placeholder.
```

### Step 2: Verify File Location
Make sure `Manu_Idle.png` is in the correct location:
```
/public/Manu_Idle.png  ✅ Correct
/public/assets/Manu_Idle.png  ❌ Wrong location
```

### Step 3: Check File Format
The spritesheet should be:
- **Format**: PNG
- **Dimensions**: Multiple of 32x32 (e.g., 128x32 for 4 frames)
- **Frame Size**: 32x32 pixels each
- **Frames**: 4 frames (0, 1, 2, 3)

### Step 4: Clear Browser Cache
Sometimes browsers cache old versions:
1. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Or open Developer Tools → Network tab → check "Disable cache"

## Quick Fixes

### Fix 1: Check File Path
If the console shows `manu_idle` not found, verify the file path in Preloader.ts:

```typescript
// Make sure this path is correct
this.load.spritesheet('manu_idle', 'Manu_Idle.png', {
    frameWidth: 32,
    frameHeight: 32
});
```

### Fix 2: Verify Spritesheet Dimensions
Open `Manu_Idle.png` in an image editor and check:
- Width should be divisible by 32 (e.g., 128px = 4 frames)
- Height should be 32px
- Each frame should be 32x32 pixels

### Fix 3: Check Network Tab
1. Open Developer Tools → Network tab
2. Refresh the page
3. Look for `Manu_Idle.png` in the requests
4. Check if it loads successfully (status 200) or fails (404, etc.)

## Common Issues & Solutions

### Issue 1: File Not Found (404)
**Problem**: `Manu_Idle.png` returns 404 error
**Solution**: 
- Check file is in `/public/` folder
- Verify exact filename (case-sensitive)
- Make sure file isn't corrupted

### Issue 2: Wrong Dimensions
**Problem**: Spritesheet has wrong frame dimensions
**Solution**:
- Resize to 32x32 frames
- Ensure total width is divisible by 32
- Height should be exactly 32px

### Issue 3: Texture Loading Order
**Problem**: Texture loads after NPC creation
**Solution**: 
- NPCs are created in `create()` method
- Textures should be loaded in `preload()` method
- This is already correct in the code

### Issue 4: Browser Cache
**Problem**: Old cached version without the texture
**Solution**:
- Hard refresh the browser
- Clear browser cache
- Try incognito/private mode

## Testing the Fix

After making changes:

1. **Hard refresh** the browser (`Ctrl+F5` or `Cmd+Shift+R`)
2. **Check console** for the debug messages above
3. **Look for Manu** at position (5, 5) - should be animated, not pink
4. **Click Manu** - should trigger dialogue

## Expected Result

When working correctly:
- ✅ Manu appears as an animated sprite (not pink square)
- ✅ 4-frame idle animation plays smoothly
- ✅ Hover animation shows around her
- ✅ Click triggers dialogue
- ✅ Console shows successful loading messages

## Still Having Issues?

If Manu is still pink after trying these fixes:

1. **Check the exact console output** and share it
2. **Verify the file** `Manu_Idle.png` opens correctly in an image viewer
3. **Try a different image** temporarily to test if the system works
4. **Check browser console** for any JavaScript errors

The debugging messages I added will help identify exactly where the problem is occurring.

