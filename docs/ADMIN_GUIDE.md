# Binary Coven - Admin User Guide

Welcome to the Binary Coven Learning Management System! This guide will help you effectively manage student sessions, track progress, and utilize all admin features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Dashboard](#admin-dashboard)
3. [Session Code Management](#session-code-management)
4. [Student Management](#student-management)
5. [Analytics and Progress Tracking](#analytics-and-progress-tracking)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First-Time Setup

1. **Environment Configuration**
   - Copy `.env.example` to `.env.local`
   - Set your Supabase credentials
   - Set your admin password in `ADMIN_PASSWORD`
   - On first login, the password will be hashed automatically

2. **Database Setup**
   - Follow the instructions in `supabase/README.md`
   - Run the migration SQL in your Supabase project
   - Verify all tables and views are created

3. **Admin Access**
   - Navigate to `admin.binarycoven.xxx` (replace with your domain)
   - Enter your admin password
   - You'll be redirected to the dashboard

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for cloud features
- Supabase account and project

---

## Admin Dashboard

The dashboard provides a quick overview of your LMS activity.

### Dashboard Features

**Overview Cards**
- Total Students: Count of all registered students across all sessions
- Active Sessions: Number of currently valid session codes
- Total Sessions: All session codes ever created
- Recent Activity: Students active in the last 24 hours

**Quick Actions**
- Create Session Code: Generate a new code for students
- View All Students: Access complete student list
- View Sessions: Manage all session codes

**Recent Session Codes Table**
- Shows your most recent 5 session codes
- Status badges (Active, Expired, Scheduled)
- Student counts
- Quick access to view students per session

---

## Session Code Management

Session codes are time-limited access keys that students use to register.

### Creating a Session Code

1. Navigate to **Sessions** from the sidebar
2. Click **Create New Session Code**
3. Fill in the modal form:

**Form Fields:**

- **Custom Code** (optional)
  - Leave empty to auto-generate
  - If provided, must be unique
  - Automatically converted to uppercase
  - Use alphanumeric characters only

- **Duration**
  - Select Hours or Days
  - Enter numeric value
  - Example: 24 hours, 7 days, 30 days

- **Max Students** (optional)
  - Leave empty for unlimited
  - Set a cap if you want to limit class size
  - Students cannot register once limit is reached

4. Click **Create Session Code**
5. Code will appear in your sessions list

### Managing Session Codes

**Session Code Card Information:**
- Code (click to copy to clipboard)
- Status badge with icon
- Expiration warning (if <24 hours remaining)
- Student statistics
- Validity period
- Max students (if set)

**Filtering and Search:**
- Filter by status: All, Active, Expired, Scheduled
- Search by code using the search bar
- Results update in real-time

**Status Types:**
- **Active**: Currently valid, students can register
- **Expired**: Past validity end date
- **Scheduled**: Not yet active (validity start is in the future)

**Available Actions:**
- **View Students**: See all students registered with this code
- More actions coming soon (extend, deactivate)

### Session Code Best Practices

1. **Naming Convention**: Use descriptive custom codes
   - Examples: `FALL2024`, `WEEK1`, `CLASS-A`
   - Avoid generic codes like `TEST123`

2. **Duration Planning**
   - Regular classes: 30-90 days
   - Workshops: 1-7 days
   - Trial sessions: 1-3 days

3. **Student Limits**
   - Set limits for small group sessions
   - Use unlimited for large classes
   - Account for potential no-shows

4. **Security**
   - Don't reuse expired codes
   - Share codes only with intended students
   - Create new codes for each class/session

---

## Student Management

View and track all student profiles and their progress.

### All Students View

Navigate to **Students** to see a comprehensive list.

**Summary Statistics:**
- Total Students
- Total Quests Completed
- Total Time Spent
- Total Code Executions
- Students Active Today

**Table Features:**
- Sortable columns (click headers)
- Search by username
- Filter by session code
- Links to detailed student views

**Table Columns:**
- Username
- Session Code
- Quests Completed
- Time Spent
- Code Runs
- Last Active

### Viewing Students by Session

From the **Sessions** page:
1. Find the session code
2. Click **View Students**
3. See all students registered with that code

This view shows:
- Summary cards (total, active in 24h, average progress)
- Detailed student table
- Links to individual student details

### Individual Student Details

Click any student name to view their complete profile.

**Profile Card:**
- Student avatar and username
- Display name
- Session code (clickable)
- Join date
- Last active timestamp

**Summary Statistics:**
- Quests completed
- Quests active
- Total time spent
- Code runs
- Last save time

**Tabs:**

1. **Overview**
   - Combined view of recent activity
   - Quest progress chart
   - Recent code executions

2. **Quest Progress**
   - All quests with status
   - Time spent per quest
   - Attempts and scores
   - Phase progress
   - Expandable details

3. **Objectives**
   - Per-objective completion details
   - Sort by completion time, duration, or attempts
   - Grouped by quest
   - Shows attempts, time, and hints used

4. **Code History**
   - Complete execution log
   - Filter by quest
   - Filter by success/failure
   - View full code and results
   - Execution timestamps and durations

5. **Game State**
   - Toggle between Structured and JSON views
   - View complete saved game state
   - Resource counts
   - Entity positions
   - Code window contents

---

## Analytics and Progress Tracking

### Understanding Quest States

- **Locked**: Not yet accessible
- **Available**: Can be started
- **Active**: Currently in progress
- **Completed**: Successfully finished
- **Failed**: Did not complete successfully

### Metrics Explained

**Time Spent**
- Calculated from quest start to completion
- Includes time between sessions
- Shown in hours, minutes, or seconds

**Attempts**
- Number of times quest was started
- Resets count as new attempts
- Higher attempts may indicate difficulty

**Code Executions**
- Every time student runs code
- Includes both successful and failed runs
- Useful for understanding engagement

**Objectives**
- Individual steps within quest phases
- Tracks completion time and attempts
- Shows learning progression

### Using Analytics Effectively

1. **Identify Struggling Students**
   - High attempts with no completion
   - Long time on single quest
   - Low activity in recent days

2. **Spot Difficult Content**
   - Quests with high average attempts
   - Low completion rates
   - Many failed executions

3. **Track Engagement**
   - Time spent per session
   - Code execution frequency
   - Quest progression rate

4. **Monitor Progress**
   - Compare students within same session
   - Track improvement over time
   - Identify fast learners

---

## Best Practices

### Session Management

1. **Create Sessions in Advance**
   - Set up codes before class starts
   - Test codes before sharing with students
   - Have backup codes ready

2. **Monitor Active Sessions**
   - Check dashboard daily
   - Review student counts
   - Watch for codes expiring soon

3. **Regular Cleanup**
   - Archive expired sessions
   - Review inactive students
   - Document session outcomes

### Student Support

1. **Proactive Monitoring**
   - Check student progress weekly
   - Identify stuck students early
   - Review code execution patterns

2. **Data-Driven Interventions**
   - Contact students with low activity
   - Provide hints for difficult quests
   - Celebrate progress milestones

3. **Privacy Considerations**
   - Don't share student data publicly
   - Use anonymous data for class discussions
   - Respect student privacy settings

### Data Management

1. **Regular Backups**
   - Export student data periodically
   - Keep records of completed sessions
   - Document any issues

2. **Performance Optimization**
   - Archive old sessions when possible
   - Monitor database size
   - Clean up test accounts

3. **Security**
   - Use strong admin password
   - Don't share admin credentials
   - Log out after each session
   - Review access logs regularly

---

## Troubleshooting

### Common Issues

**Students Can't Register**
- Check session code is active
- Verify not expired
- Check student limit not reached
- Ensure correct code format (uppercase)

**Missing Student Data**
- Verify student is logged in
- Check student has saved their game
- Ensure analytics service is running
- Review browser console for errors

**Dashboard Not Loading**
- Check internet connection
- Verify Supabase credentials
- Check API endpoints are accessible
- Clear browser cache

**Session Code Issues**
- Ensure unique code
- Check validity dates are correct
- Verify max_students is not 0
- Review session_codes table in database

### Getting Help

For additional support:
1. Check `docs/TROUBLESHOOTING.md`
2. Review `docs/API_REFERENCE.md`
3. Check Supabase logs
4. Review browser console errors
5. Contact system administrator

---

## Advanced Features

### Custom Analytics Queries

Access Supabase directly for custom queries:
1. Log into Supabase dashboard
2. Navigate to SQL Editor
3. Query tables:
   - `student_progress_summary` view
   - `quest_progress` table
   - `code_executions` table

### Bulk Operations

For bulk student management:
1. Export data via Supabase dashboard
2. Process in spreadsheet software
3. Import updated data if needed

### Integration Options

The LMS API can be integrated with:
- External analytics tools
- Learning management systems
- Reporting dashboards
- Automated notification systems

See `docs/API_REFERENCE.md` for API details.

---

## Appendix

### Keyboard Shortcuts

- Navigate dashboard: Arrow keys
- Search: Ctrl/Cmd + K
- Refresh data: F5

### Session Code Format

- Length: 6-20 characters
- Characters: A-Z, 0-9
- Case: Uppercase only
- No special characters

### Data Retention

- Active sessions: Indefinite
- Expired sessions: Indefinite
- Student data: Indefinite
- Code executions: Last 50 per student
- Analytics events: All retained

### Support

For technical support or feature requests:
- GitHub: [Repository URL]
- Email: [Support Email]
- Documentation: `docs/` folder

---

**Version**: 1.0
**Last Updated**: Phase 10 - Polish & Testing
**Next Review**: After production deployment
