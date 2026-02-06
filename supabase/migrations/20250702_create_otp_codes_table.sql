-- Create otp_codes table for storing OTP verification codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE NOT NULL
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

-- Auto-cleanup: delete expired OTP codes older than 10 minutes
-- (Run this periodically or use a Supabase cron job)
-- DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '10 minutes';
