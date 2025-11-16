-- Multi-Admin System Migration
-- Creates admin_users table and updates session_codes to support multiple admin accounts

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add created_by_admin_id to session_codes table
ALTER TABLE session_codes
ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admin_users(id);

-- 3. Insert initial super admin account (thaddeus11)
-- Password: thaddeusbinary (hashed with bcrypt, 10 rounds)
INSERT INTO admin_users (username, password_hash, role, is_active)
VALUES (
  'thaddeus11',
  '$2b$10$RePNa4d.K.YCwPFe8DL9huZ1ckbuDPfrkEzERZIgwm4dXhyALpJV.',
  'super_admin',
  true
)
ON CONFLICT (username) DO NOTHING;

-- 4. Update all existing session codes to be owned by thaddeus11
UPDATE session_codes
SET created_by_admin_id = (SELECT id FROM admin_users WHERE username = 'thaddeus11' LIMIT 1)
WHERE created_by_admin_id IS NULL;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_session_codes_created_by_admin ON session_codes(created_by_admin_id);

-- 6. Enable Row Level Security on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for admin_users
-- Policy: Admin users table is only accessible via service role (backend only)
CREATE POLICY "Admin users are accessible via service role only"
  ON admin_users
  FOR ALL
  USING (false); -- No direct access from client

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for updated_at
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- 10. Update session_code_stats view to include created_by_admin_id
DROP VIEW IF EXISTS session_code_stats;
CREATE OR REPLACE VIEW session_code_stats AS
SELECT
  sc.id,
  sc.code,
  sc.validity_start,
  sc.validity_end,
  sc.is_active,
  sc.created_at,
  sc.created_by_admin_id,
  COUNT(DISTINCT sp.id) as student_count,
  COUNT(DISTINCT CASE WHEN sp.last_login > NOW() - INTERVAL '24 hours' THEN sp.id END) as active_students_24h,
  CASE
    WHEN sc.validity_end < TIMEZONE('utc', NOW()) THEN 'expired'
    WHEN sc.validity_start > TIMEZONE('utc', NOW()) THEN 'scheduled'
    ELSE 'active'
  END as status
FROM session_codes sc
LEFT JOIN student_profiles sp ON sc.id = sp.session_code_id
GROUP BY sc.id, sc.code, sc.validity_start, sc.validity_end, sc.is_active, sc.created_at, sc.created_by_admin_id;

-- 11. Grant access to the updated view
GRANT SELECT ON session_code_stats TO authenticated;

-- 12. Add comments for documentation
COMMENT ON TABLE admin_users IS 'Stores admin user accounts with role-based access control';
COMMENT ON COLUMN admin_users.role IS 'Admin role: super_admin can manage other admins, admin can only manage their own sessions';
COMMENT ON COLUMN admin_users.is_active IS 'Soft delete flag: when false, admin is archived and cannot log in';
COMMENT ON COLUMN session_codes.created_by_admin_id IS 'Foreign key to admin_users: tracks which admin created this session';
