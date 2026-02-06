// API route for student login
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient, getSupabaseAdminClient } from '@/lib/supabase/server'
import type { SessionCode, StudentProfile } from '@/types/database'
import bcrypt from 'bcryptjs'

type LoginRequest = {
  username: string
  password: string
  sessionCode: string
}

type LoginResponse = {
  success: boolean
  message?: string
  needsOtp?: boolean
  student?: {
    id: string
    username: string
    displayName: string | null
    sessionCodeId: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    const { username, password, sessionCode }: LoginRequest = req.body

    // Validate input
    if (!username || !password || !sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and session code are required',
      })
    }

    // Use admin client for session code lookup (bypasses RLS since this is a public validation endpoint)
    const adminSupabase = getSupabaseAdminClient()

    // Check if session code is valid
    const { data: sessionCodeData, error: sessionCodeError } = await adminSupabase
      .from('session_codes')
      .select('id, code, validity_start, validity_end, is_active')
      .eq('code', sessionCode)
      .maybeSingle() as { data: Pick<SessionCode, 'id' | 'code' | 'validity_start' | 'validity_end' | 'is_active'> | null, error: any }

    // Create regular Supabase client for student operations
    const supabase = getSupabaseApiClient(req, res)

    if (sessionCodeError) {
      console.error('Error validating session code:', sessionCodeError)
      return res.status(500).json({
        success: false,
        message: 'An error occurred while validating session code',
      })
    }

    if (!sessionCodeData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session code',
      })
    }

    // Check if session code is currently valid
    const now = new Date()
    const validityStart = new Date(sessionCodeData.validity_start)
    const validityEnd = new Date(sessionCodeData.validity_end)

    if (!sessionCodeData.is_active) {
      return res.status(400).json({
        success: false,
        message: 'This session code has been deactivated',
      })
    }

    if (now < validityStart) {
      return res.status(400).json({
        success: false,
        message: 'This session code is not yet active',
      })
    }

    if (now > validityEnd) {
      return res.status(400).json({
        success: false,
        message: 'This session code has expired',
      })
    }

    // Check if student exists with this username and session code
    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('username', username)
      .eq('session_code_id', sessionCodeData.id)
      .maybeSingle() as { data: StudentProfile | null, error: any }

    if (studentError || !studentData) {
      // Student doesn't exist - new account needs OTP verification
      return res.status(200).json({
        success: false,
        needsOtp: true,
        message: 'New account detected. Email verification required.',
      })
    }

    // Student exists - verify password
    // Support both bcrypt hashes (new) and legacy plaintext (old) with auto-upgrade
    let passwordMatch = false
    const storedHash = studentData.password_hash

    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
      // Already a bcrypt hash
      passwordMatch = await bcrypt.compare(password, storedHash)
    } else {
      // Legacy plaintext comparison
      passwordMatch = password === storedHash

      // Auto-upgrade to bcrypt on successful login
      if (passwordMatch) {
        const newHash = await bcrypt.hash(password, 10)
        await supabase
          .from('student_profiles')
          .update({ password_hash: newHash })
          .eq('id', studentData.id)
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      })
    }

    // Update last login time
    await supabase
      .from('student_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', studentData.id)

    // Set session cookie
    const securePart = process.env.NODE_ENV === 'production' ? ' Secure;' : ''
    res.setHeader('Set-Cookie', `student_session_id=${studentData.id}; Path=/; HttpOnly;${securePart} SameSite=Strict; Max-Age=2592000`)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      student: {
        id: studentData.id,
        username: studentData.username,
        displayName: studentData.display_name,
        sessionCodeId: studentData.session_code_id,
      },
    })
  } catch (error) {
    console.error('Student login error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    })
  }
}
