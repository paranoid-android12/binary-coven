# Supabase Setup Guide for Binary Coven LMS

This guide will walk you through setting up Supabase for the Binary Coven Learning Management System.

## Prerequisites

- A Supabase account (free tier works fine)
- Access to the Supabase dashboard

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in the details:
   - **Project name**: binary-coven-lms (or your preferred name)
   - **Database password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project" and wait for setup to complete

## Step 2: Get Your API Credentials

Once your project is created:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (a long string starting with `eyJ...`)

## Step 3: Create Environment Variables

1. Create a `.env.local` file in the root of your project:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
ADMIN_PASSWORD=your-admin-password-here
```

Replace:
- `https://your-project.supabase.co` with your actual Project URL
- `your-anon-key-here` with your actual anon public key
- `your-admin-password-here` with a secure admin password (this will be hashed automatically)

## Step 4: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (in the left sidebar)
2. Click "New query"
3. Copy the entire contents of `migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" (or press Ctrl/Cmd + Enter)

You should see a success message. This creates all the necessary tables, indexes, and security policies.

## Step 5: Verify the Setup

1. In your Supabase dashboard, go to **Table Editor**
2. You should see the following tables:
   - `admin_settings`
   - `session_codes`
   - `student_profiles`
   - `game_saves`
   - `quest_progress`
   - `objective_progress`
   - `code_executions`
   - `learning_events`

3. Check the **Authentication** section:
   - Go to **Authentication > Providers**
   - Ensure Email provider is enabled (it should be by default)

## Step 6: (Optional) Insert Test Data

If you want to test with sample data:

1. Uncomment the sample data section at the bottom of `001_initial_schema.sql`
2. Run it again in the SQL Editor

This will create:
- A test session code: `TEST2024` (valid for 30 days)
- A test student: username `test_student`, password `student123`

## Step 7: Test the Connection

Once you've set up everything:

1. Start your Next.js development server:
```bash
npm run dev
```

2. The app should start without errors
3. Check the browser console for any Supabase connection errors

## Database Schema Overview

### Tables

- **admin_settings**: Stores admin credentials (password hash)
- **session_codes**: Session codes with validity periods that admin generates
- **student_profiles**: Student accounts (username + password + session code)
- **game_saves**: Complete game state for each student
- **quest_progress**: Quest-level progress tracking
- **objective_progress**: Individual objective progress within quests
- **code_executions**: History of all code runs by students
- **learning_events**: General analytics events

### Security

The database uses Row Level Security (RLS) to ensure:
- Students can only access their own data
- Admin operations require service role key (backend only)
- All queries are secured by default

## Troubleshooting

### "Invalid API key" error
- Double-check that you copied the **anon public** key (not the service_role key)
- Make sure there are no extra spaces in your `.env.local` file

### "relation does not exist" error
- The migration didn't run successfully
- Go back to Step 4 and run the migration again
- Check for any error messages in the SQL Editor

### "RLS policy violation" error
- This means the Row Level Security is working correctly
- Make sure you're authenticated when accessing data
- For admin operations, you'll need to use the service role key on the backend

## Next Steps

After setup is complete:
1. Test the admin login flow
2. Generate a session code
3. Create a test student account
4. Verify data is being saved to Supabase

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
