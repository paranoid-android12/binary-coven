-- Add email column to student_profiles for password recovery
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index on email for faster lookups (password reset)
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON student_profiles(email);
