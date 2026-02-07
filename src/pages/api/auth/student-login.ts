// API route for student login — Global Account System
// Supports:
//   - Existing user (email + username match) → verify password → auto-link to session → login
//   - Email/username mismatch → error
//   - New user (neither email nor username exist) → trigger OTP registration
//   - Conflict (email OR username already taken by different account) → error
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient, getSupabaseAdminClient } from '@/lib/supabase/server'
import type { SessionCode, StudentProfile } from '@/types/database'
import bcrypt from 'bcryptjs'

type LoginRequest = {
  username: string
  password: string
  sessionCode: string
  email: string
}

type LoginResponse = {
  success: boolean
  message?: string
  needsOtp?: boolean
  linkedNewSession?: boolean
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
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    const { username, password, sessionCode, email }: LoginRequest = req.body

    if (!username || !password || !sessionCode || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, session code, and email are required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const adminSupabase = getSupabaseAdminClient()

    // ── Validate session code ──────────────────────────────────────────
    const { data: sessionCodeData, error: sessionCodeError } = await adminSupabase
      .from('session_codes')
      .select('id, code, validity_start, validity_end, is_active')
      .eq('code', sessionCode)
      .maybeSingle() as { data: Pick<SessionCode, 'id' | 'code' | 'validity_start' | 'validity_end' | 'is_active'> | null, error: any }

    if (sessionCodeError) {
      console.error('Error validating session code:', sessionCodeError)
      return res.status(500).json({
        success: false,
        message: 'An error occurred while validating session code',
      })
    }

    if (!sessionCodeData) {
      return res.status(400).json({ success: false, message: 'Invalid session code' })
    }

    const now = new Date()
    if (!sessionCodeData.is_active) {
      return res.status(400).json({ success: false, message: 'This session code has been deactivated' })
    }
    if (now < new Date(sessionCodeData.validity_start)) {
      return res.status(400).json({ success: false, message: 'This session code is not yet active' })
    }
    if (now > new Date(sessionCodeData.validity_end)) {
      return res.status(400).json({ success: false, message: 'This session code has expired' })
    }

    const supabase = getSupabaseApiClient(req, res)

    // ── Look up by username AND by email separately ────────────────────
    const { data: studentByUsername, error: usernameError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle() as { data: StudentProfile | null, error: any }

    const { data: studentByEmail, error: emailError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle() as { data: StudentProfile | null, error: any }

    if (usernameError) {
      console.error('Error looking up student by username:', usernameError)
      return res.status(500).json({ success: false, message: 'An error occurred during login' })
    }
    if (emailError) {
      console.error('Error looking up student by email:', emailError)
      return res.status(500).json({ success: false, message: 'An error occurred during login' })
    }

    // ── Case 1: Account found (email + username match same account) ────
    if (studentByUsername && studentByEmail && studentByUsername.id === studentByEmail.id) {
      // Both match the same account — proceed with password verification
      const studentData = studentByUsername
      // (password check happens below)

      // ── Verify password ──────────────────────────────────────────────
      let passwordMatch = false
      const storedHash = studentData.password_hash

      if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        passwordMatch = await bcrypt.compare(password, storedHash)
      } else {
        // Legacy plaintext comparison + auto-upgrade
        passwordMatch = password === storedHash
        if (passwordMatch) {
          const newHash = await bcrypt.hash(password, 10)
          await (supabase
            .from('student_profiles') as any)
            .update({ password_hash: newHash })
            .eq('id', studentData.id)
        }
      }

      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password' })
      }

      // ── Check / create student_sessions link ─────────────────────────
      let linkedNewSession = false

      const { data: existingLink } = await (supabase
        .from('student_sessions') as any)
        .select('id')
        .eq('student_profile_id', studentData.id)
        .eq('session_code_id', sessionCodeData.id)
        .maybeSingle()

      if (!existingLink) {
        const { error: linkError } = await (supabase
          .from('student_sessions') as any)
          .insert({
            student_profile_id: studentData.id,
            session_code_id: sessionCodeData.id,
          })

        if (linkError) {
          console.error('Error linking student to session:', linkError)
        } else {
          linkedNewSession = true
          console.log(`[Login] Linked ${username} to new session ${sessionCode}`)
        }

        // Create a fresh game save for this new session
        await (supabase
          .from('game_saves') as any)
          .upsert({
            student_profile_id: studentData.id,
            session_code_id: sessionCodeData.id,
            game_state: {
              grids: [],
              entities: [],
              globalResources: { wheat: 0, energy: 100 },
              codeWindows: [],
              questProgress: {},
            },
            save_name: 'autosave',
          })
      }

      // ── Update legacy session_code_id on profile (transition period) ─
      await (supabase
        .from('student_profiles') as any)
        .update({
          session_code_id: sessionCodeData.id,
          last_login: new Date().toISOString(),
        })
        .eq('id', studentData.id)

      // ── Set session cookie ───────────────────────────────────────────
      const securePart = process.env.NODE_ENV === 'production' ? ' Secure;' : ''
      res.setHeader('Set-Cookie', `student_session_id=${studentData.id}; Path=/; HttpOnly;${securePart} SameSite=Strict; Max-Age=2592000`)

      return res.status(200).json({
        success: true,
        message: linkedNewSession ? 'Welcome back! You\'ve been linked to this session.' : 'Login successful',
        linkedNewSession,
        student: {
          id: studentData.id,
          username: studentData.username,
          displayName: studentData.display_name,
          sessionCodeId: sessionCodeData.id,
        },
      })
    }

    // ── Case 2: Email/username mismatch (one exists with different account) ─
    if (studentByUsername && !studentByEmail) {
      // Username taken by a different email
      return res.status(400).json({
        success: false,
        message: 'This username is already registered with a different email address.',
      })
    }

    if (!studentByUsername && studentByEmail) {
      // Email taken by a different username
      return res.status(400).json({
        success: false,
        message: 'This email is already registered with a different username.',
      })
    }

    if (studentByUsername && studentByEmail && studentByUsername.id !== studentByEmail.id) {
      // Both exist but belong to different accounts
      return res.status(400).json({
        success: false,
        message: 'Email and username are associated with different accounts.',
      })
    }

    // ── Case 3: Neither exists — new user, needs OTP ───────────────────
    return res.status(200).json({
      success: false,
      needsOtp: true,
      message: 'New account detected. Email verification required.',
    })
  } catch (error) {
    console.error('Student login error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    })
  }
}
