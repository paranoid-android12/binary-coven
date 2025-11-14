# Binary Coven - Troubleshooting Guide

Comprehensive troubleshooting guide for common issues in the Binary Coven Learning Management System.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Setup Issues](#setup-issues)
3. [Authentication Problems](#authentication-problems)
4. [Session Code Issues](#session-code-issues)
5. [Game State Problems](#game-state-problems)
6. [Analytics Not Tracking](#analytics-not-tracking)
7. [Admin Dashboard Issues](#admin-dashboard-issues)
8. [Performance Problems](#performance-problems)
9. [Database Issues](#database-issues)
10. [Deployment Issues](#deployment-issues)

---

## Quick Diagnostics

### Health Check Checklist

Run through this checklist first:

- [ ] Is Supabase project running and accessible?
- [ ] Are environment variables set correctly?
- [ ] Is the development server running (`npm run dev`)?
- [ ] Are cookies enabled in the browser?
- [ ] Is JavaScript enabled in the browser?
- [ ] Are there any errors in browser console?
- [ ] Are there any errors in server console?
- [ ] Is the database schema up to date?

### Browser Console Check

Open browser developer tools (F12) and check:
1. **Console Tab**: Look for JavaScript errors
2. **Network Tab**: Check for failed API requests (red)
3. **Application Tab**: Verify cookies are set

### Common Quick Fixes

- **Clear browser cache** and reload
- **Clear cookies** and log in again
- **Restart development server**
- **Check .env.local file** exists and has correct values
- **Verify database migration** was run

---

## Setup Issues

### Issue: "Missing Supabase environment variables"

**Symptoms:**
- Application won't start
- Error in console about missing env vars

**Solution:**
1. Verify `.env.local` file exists in project root
2. Check it contains all required variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ADMIN_PASSWORD=...
   ```
3. Get values from Supabase dashboard:
   - Project Settings → API
   - Copy URL, anon key, and service_role key
4. Restart development server after adding variables

**Prevention:**
- Use `.env.example` as template
- Document env vars for team
- Use environment variable validation

---

### Issue: Database tables not found

**Symptoms:**
- API errors about missing tables
- "relation does not exist" errors in console

**Solution:**
1. Log into Supabase dashboard
2. Go to SQL Editor
3. Run the migration SQL from `supabase/migrations/001_initial_schema.sql`
4. Verify all tables appear in Table Editor
5. Check views were created: `session_code_stats`, `student_progress_summary`

**Verification:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

Should show:
- admin_settings
- session_codes
- student_profiles
- game_saves
- quest_progress
- objective_progress
- code_executions
- learning_events

---

### Issue: Build fails

**Symptoms:**
- `npm run build` command fails
- TypeScript errors
- Module not found errors

**Solution:**
1. Delete `.next` folder and `node_modules`
2. Run `npm install` again
3. Check for TypeScript errors: `npx tsc --noEmit`
4. Fix any TypeScript errors shown
5. Run `npm run build` again

**Common causes:**
- Outdated dependencies
- TypeScript configuration issues
- Missing type definitions
- Import path errors

---

## Authentication Problems

### Issue: Student can't log in

**Symptoms:**
- Login button disabled
- Error message "Invalid session code"
- Error message "Incorrect password"

**Diagnosis:**

1. **Check session code validity:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT code, validity_start, validity_end, is_active, max_students
   FROM session_codes
   WHERE code = 'YOUR_CODE';
   ```

2. **Check if session is full:**
   ```sql
   SELECT COUNT(*) as student_count
   FROM student_profiles
   WHERE session_code_id = (
     SELECT id FROM session_codes WHERE code = 'YOUR_CODE'
   );
   ```

3. **Check student exists:**
   ```sql
   SELECT username, created_at, last_login
   FROM student_profiles
   WHERE username = 'student_name'
     AND session_code_id = (
       SELECT id FROM session_codes WHERE code = 'YOUR_CODE'
     );
   ```

**Solutions:**

**Session code not found:**
- Verify code is entered correctly (uppercase)
- Check code exists in admin dashboard
- Create new code if needed

**Session code expired:**
- Check validity dates
- Create new session code
- Or extend existing code (future feature)

**Session code full:**
- Check max_students limit
- Increase limit or create new code

**Wrong password:**
- Student needs to remember correct password
- Admin can reset by deleting student profile (they can re-register)

---

### Issue: Admin can't log in

**Symptoms:**
- "Incorrect password" error
- Login button doesn't work

**Solution:**

1. **Check admin_settings table:**
   ```sql
   SELECT COUNT(*) FROM admin_settings;
   ```

2. **If empty, initialization failed:**
   - Check `ADMIN_PASSWORD` env var is set
   - Restart server to trigger initialization
   - On first login, password is hashed automatically

3. **Reset admin password:**
   ```sql
   -- Delete existing password
   DELETE FROM admin_settings;

   -- Set new password in .env.local
   -- ADMIN_PASSWORD=newpassword123

   -- Restart server and log in
   -- Password will be hashed on first use
   ```

**Prevention:**
- Document admin password securely
- Use strong password
- Consider using bcrypt hash directly in production

---

### Issue: Session expires immediately

**Symptoms:**
- Logged out right after login
- Cookie not persisting

**Solution:**

1. **Check cookie settings in browser:**
   - Ensure cookies are enabled
   - Check third-party cookie settings
   - Try different browser

2. **Check cookie is set:**
   - Open DevTools → Application → Cookies
   - Look for `student_session_id` or `admin_session`
   - Verify it has correct domain and path

3. **Check middleware:**
   - Review `src/middleware.ts`
   - Verify cookie name matches
   - Check Max-Age is set correctly (30 days)

**Common causes:**
- Browser privacy settings too strict
- Cookie SameSite policy conflicts
- HTTPS/HTTP mismatch
- Domain configuration issues

---

## Session Code Issues

### Issue: Can't create session code

**Symptoms:**
- "Session code already exists" error
- Create button doesn't work
- Modal doesn't open

**Solution:**

1. **Code already exists:**
   - Try different code
   - Or let system auto-generate
   - Check existing codes in Sessions page

2. **Missing admin auth:**
   - Verify admin is logged in
   - Check `admin_session` cookie exists
   - Try logging out and back in

3. **Date validation fails:**
   - Check duration is positive
   - Verify end date is in future
   - Use days instead of hours for long sessions

---

### Issue: Session code not showing in list

**Symptoms:**
- Created code doesn't appear
- List is empty
- Only some codes show

**Solution:**

1. **Verify code was created:**
   ```sql
   SELECT * FROM session_codes
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Check filters:**
   - Clear search box
   - Set filter to "All"
   - Refresh page

3. **Check view permissions:**
   - Verify RLS policies on session_codes table
   - Admin should be using service_role key
   - Check Supabase logs for permission errors

---

## Game State Problems

### Issue: Game won't save

**Symptoms:**
- "Save failed" notification
- Progress lost on reload
- Only saves to localStorage

**Solution:**

1. **Check student authentication:**
   - Verify student is logged in
   - Check `student_session_id` cookie
   - Try logging out and back in

2. **Check network connectivity:**
   - Open Network tab in DevTools
   - Look for failed `/api/game/save` request
   - Check response error message

3. **Verify game state structure:**
   ```javascript
   // Game state should have required fields
   {
     grids: [],
     entities: [],
     globalResources: {},
     codeWindows: [],
     questProgress: {}
   }
   ```

4. **Check database constraints:**
   ```sql
   -- Check for save conflicts
   SELECT * FROM game_saves
   WHERE student_profile_id = 'student_id';
   ```

**Fallback behavior:**
- System automatically falls back to localStorage
- Data is safe even if cloud save fails
- Will retry on next save attempt

---

### Issue: Game won't load

**Symptoms:**
- "No save found" message
- Starts fresh game each time
- Lost all progress

**Solution:**

1. **Check if save exists:**
   ```sql
   SELECT last_saved, save_version
   FROM game_saves
   WHERE student_profile_id = 'student_id'
     AND save_name = 'autosave';
   ```

2. **Check localStorage backup:**
   - Open DevTools → Application → Local Storage
   - Look for `binary-coven-save` key
   - If exists, game will load from there

3. **Recover from backup:**
   ```javascript
   // In browser console
   const backup = localStorage.getItem('binary-coven-save-backup');
   if (backup) {
     localStorage.setItem('binary-coven-save', backup);
     location.reload();
   }
   ```

**Prevention:**
- Save regularly during gameplay
- Don't clear browser data
- Use manual save button before closing
- Keep localStorage backup

---

### Issue: Reset doesn't work

**Symptoms:**
- Reset button does nothing
- Progress still there after reset
- Error during reset

**Solution:**

1. **Confirm reset in dialog:**
   - Make sure to click "Yes, Reset"
   - Check confirmation modal appears

2. **Manually clear data:**
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM game_saves WHERE student_profile_id = 'student_id';
   DELETE FROM quest_progress WHERE student_profile_id = 'student_id';
   DELETE FROM objective_progress WHERE student_profile_id = 'student_id';
   DELETE FROM code_executions WHERE student_profile_id = 'student_id';
   ```

3. **Clear localStorage:**
   ```javascript
   // In browser console
   localStorage.removeItem('binary-coven-save');
   localStorage.removeItem('binary-coven-save-backup');
   location.reload();
   ```

---

## Analytics Not Tracking

### Issue: Quest progress not recorded

**Symptoms:**
- Admin dashboard shows 0 quests
- Progress not updating
- Missing analytics data

**Solution:**

1. **Check analytics service:**
   ```javascript
   // In browser console
   import analyticsService from '@/services/analyticsService';
   // Should not error
   ```

2. **Check batch queue:**
   ```javascript
   // Check localStorage for queued requests
   const queue = localStorage.getItem('analyticsQueue');
   console.log(JSON.parse(queue || '[]'));
   ```

3. **Verify API endpoints work:**
   ```bash
   # Test from command line
   curl -X POST https://binarycoven.xxx/api/analytics/quest-progress \
     -H "Content-Type: application/json" \
     -b "student_session_id=..." \
     -d '{"questId":"test","questTitle":"Test","state":"active"}'
   ```

4. **Check database:**
   ```sql
   SELECT * FROM quest_progress
   WHERE student_profile_id = 'student_id'
   ORDER BY started_at DESC;
   ```

**Common causes:**
- Analytics service not initialized
- Network errors during batch send
- Student not authenticated
- API endpoint errors

---

### Issue: Code executions not logged

**Symptoms:**
- Code History tab empty
- Execution count is 0
- No execution data

**Solution:**

1. **Check CodeExecutor integration:**
   - Review `src/game/systems/CodeExecutor.ts`
   - Verify `analyticsService.trackCodeExecution()` is called
   - Check line ~97-109

2. **Test manually:**
   ```javascript
   // In browser console
   import analyticsService from '@/services/analyticsService';

   analyticsService.trackCodeExecution(
     'main',
     'test code',
     { success: true },
     'test-quest',
     'test-phase'
   );
   ```

3. **Check queue processing:**
   - Wait 2-3 seconds for batch to send
   - Check Network tab for POST requests
   - Look for errors in console

---

## Admin Dashboard Issues

### Issue: Dashboard shows wrong data

**Symptoms:**
- Student count incorrect
- Session stats wrong
- Data not updating

**Solution:**

1. **Clear cache and refresh:**
   - Hard reload: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Clear browser cache
   - Close and reopen browser

2. **Check database views:**
   ```sql
   -- Refresh materialized views if using them
   REFRESH MATERIALIZED VIEW session_code_stats;
   REFRESH MATERIALIZED VIEW student_progress_summary;
   ```

3. **Verify data directly:**
   ```sql
   -- Check actual counts
   SELECT COUNT(*) FROM student_profiles;
   SELECT COUNT(*) FROM session_codes WHERE is_active = true;
   ```

---

### Issue: Can't view student details

**Symptoms:**
- Student detail page shows error
- 404 not found
- Empty data

**Solution:**

1. **Verify student ID:**
   - Check URL has valid UUID
   - Copy student ID from students list
   - Don't manually type ID

2. **Check API endpoint:**
   ```bash
   curl https://admin.binarycoven.xxx/api/analytics/student/STUDENT_ID \
     -b "admin_session=true"
   ```

3. **Verify student exists:**
   ```sql
   SELECT id, username, display_name
   FROM student_profiles
   WHERE id = 'student_id';
   ```

---

## Performance Problems

### Issue: Dashboard loads slowly

**Symptoms:**
- Long wait times
- Spinner shows for too long
- Browser becomes unresponsive

**Solution:**

1. **Check data volume:**
   ```sql
   -- Check table sizes
   SELECT COUNT(*) FROM student_profiles;
   SELECT COUNT(*) FROM quest_progress;
   SELECT COUNT(*) FROM code_executions;
   ```

2. **Optimize queries:**
   - Add indexes if needed
   - Limit large result sets
   - Use pagination for lists

3. **Reduce analytics batch size:**
   - Edit `src/services/analyticsService.ts`
   - Reduce `MAX_QUEUE_SIZE` if needed
   - Increase `BATCH_DELAY` to reduce frequency

4. **Clear old data:**
   ```sql
   -- Archive old sessions
   UPDATE session_codes
   SET is_active = false
   WHERE validity_end < NOW() - INTERVAL '90 days';

   -- Consider removing very old executions
   -- (Be careful - this deletes data!)
   DELETE FROM code_executions
   WHERE executed_at < NOW() - INTERVAL '180 days';
   ```

---

### Issue: Game performance drops

**Symptoms:**
- Low FPS
- Stuttering
- Slow response

**Solution:**

1. **Reduce auto-save frequency:**
   - Edit auto-save triggers in `ProgrammingGame.ts`
   - Only save on quest completion, not every change

2. **Optimize analytics:**
   - Analytics batching should prevent overhead
   - Check queue isn't growing unbounded
   - Verify batch processor is running

3. **Check browser:**
   - Close other tabs
   - Disable browser extensions
   - Try different browser
   - Check system resources

---

## Database Issues

### Issue: Row Level Security (RLS) errors

**Symptoms:**
- "permission denied" errors
- Empty results when data exists
- Operations fail unexpectedly

**Solution:**

1. **Check RLS policies:**
   ```sql
   -- View policies
   SELECT * FROM pg_policies WHERE tablename = 'student_profiles';
   ```

2. **Verify service role key:**
   - Admin operations use `SUPABASE_SERVICE_ROLE_KEY`
   - Student operations use anon key with RLS
   - Check correct key is used in API routes

3. **Test policies:**
   ```sql
   -- Test as authenticated user
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claim.sub TO 'student_id';
   SELECT * FROM game_saves WHERE student_profile_id = 'student_id';
   ```

4. **Temporarily disable RLS (testing only):**
   ```sql
   ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY;
   -- Don't forget to re-enable!
   ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
   ```

---

### Issue: Database connection errors

**Symptoms:**
- "Failed to connect" errors
- Timeout errors
- 500 server errors

**Solution:**

1. **Check Supabase status:**
   - Visit Supabase dashboard
   - Check project is running
   - Look for maintenance notifications

2. **Verify credentials:**
   - Check SUPABASE_URL is correct
   - Verify keys haven't been rotated
   - Test connection in Supabase dashboard

3. **Check network:**
   - Verify internet connection
   - Check firewall settings
   - Try different network

4. **Check Supabase limits:**
   - Free tier has connection limits
   - Upgrade plan if needed
   - Check usage in dashboard

---

## Deployment Issues

### Issue: Build fails in production

**Symptoms:**
- Build errors during deployment
- Works locally but not in production
- Missing environment variables

**Solution:**

1. **Check environment variables:**
   - Set all env vars in deployment platform
   - Don't commit `.env.local` to git
   - Use deployment platform's env var UI

2. **Test build locally:**
   ```bash
   # Clean build
   rm -rf .next node_modules
   npm install
   npm run build
   npm start
   ```

3. **Check build output:**
   - Look for errors in build log
   - Verify all pages compile
   - Check for missing dependencies

---

### Issue: Subdomain routing not working

**Symptoms:**
- `admin.domain.com` shows 404
- Subdomain doesn't load admin panel
- Redirects not working

**Solution:**

1. **DNS Configuration:**
   - Add A or CNAME record for `admin.yourdomain.com`
   - Point to same server as main domain
   - Allow 24-48 hours for propagation

2. **Server Configuration:**
   - Configure server to handle subdomains
   - Ensure middleware runs on all requests
   - Check Next.js config allows middleware

3. **Test locally with hosts file:**
   ```
   # Add to /etc/hosts (Mac/Linux) or C:\Windows\System32\drivers\etc\hosts (Windows)
   127.0.0.1 admin.localhost
   ```

4. **Verify middleware:**
   - Check `src/middleware.ts` runs
   - Add console logs for debugging
   - Test subdomain detection logic

---

## Getting Additional Help

### Diagnostic Information to Collect

When reporting issues, include:

1. **Environment:**
   - Operating system
   - Browser and version
   - Node.js version
   - Next.js version

2. **Error details:**
   - Exact error message
   - Browser console log
   - Server console log
   - Network tab screenshot

3. **Steps to reproduce:**
   - What you were doing
   - What you expected
   - What actually happened

4. **Database state:**
   - Relevant SQL query results
   - Table row counts
   - Recent migrations run

### Useful Commands

```bash
# Check versions
node --version
npm --version
npx next --version

# View logs
npm run dev 2>&1 | tee debug.log

# Test database connection
# (use Supabase SQL Editor)
SELECT version();
SELECT NOW();

# Check Next.js build
npm run build -- --debug
```

### Support Resources

- **Documentation**: `docs/` folder
- **Admin Guide**: `docs/ADMIN_GUIDE.md`
- **API Reference**: `docs/API_REFERENCE.md`
- **Implementation Guide**: `LMS_IMPLEMENTATION_GUIDE.md`
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Appendix: Emergency Procedures

### Complete System Reset

**WARNING: This deletes all data!**

```sql
-- Backup first!
-- Then run in Supabase SQL Editor:

TRUNCATE TABLE learning_events CASCADE;
TRUNCATE TABLE code_executions CASCADE;
TRUNCATE TABLE objective_progress CASCADE;
TRUNCATE TABLE quest_progress CASCADE;
TRUNCATE TABLE game_saves CASCADE;
TRUNCATE TABLE student_profiles CASCADE;
TRUNCATE TABLE session_codes CASCADE;
TRUNCATE TABLE admin_settings CASCADE;

-- Verify all empty
SELECT 'student_profiles' as table, COUNT(*) FROM student_profiles
UNION ALL
SELECT 'session_codes', COUNT(*) FROM session_codes;
```

### Recover from Backup

```bash
# If you have SQL backup
psql $DATABASE_URL < backup.sql

# Or use Supabase dashboard:
# Project Settings → Database → Restore
```

---

**Version**: 1.0
**Last Updated**: Phase 10 - Polish & Testing
**Next Review**: After production use
