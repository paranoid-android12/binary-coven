// API route: Verify OTP and register a new student account
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient, getSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyOtp } from '@/lib/otpStore'
import type { SessionCode, StudentProfile } from '@/types/database'
import bcrypt from 'bcryptjs'

type VerifyOtpResponse = {
  success: boolean
  message: string
  student?: {
    id: string
    username: string
    displayName: string | null
    sessionCodeId: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyOtpResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { email, otp, username, password, sessionCode } = req.body

    // Validate inputs
    if (!email || !otp || !username || !password || !sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (email, otp, username, password, sessionCode)',
      })
    }

    // Verify OTP
    const otpResult = await verifyOtp(email, otp)
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      })
    }

    // OTP is valid — now create the student account
    const adminSupabase = getSupabaseAdminClient()

    // Re-validate session code
    const { data: sessionCodeData, error: sessionCodeError } = await adminSupabase
      .from('session_codes')
      .select('id, code, validity_start, validity_end, is_active')
      .eq('code', sessionCode)
      .maybeSingle() as { data: Pick<SessionCode, 'id' | 'code' | 'validity_start' | 'validity_end' | 'is_active'> | null, error: any }

    if (sessionCodeError || !sessionCodeData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session code',
      })
    }

    // Check session code validity
    const now = new Date()
    const validityStart = new Date(sessionCodeData.validity_start)
    const validityEnd = new Date(sessionCodeData.validity_end)

    if (!sessionCodeData.is_active) {
      return res.status(400).json({ success: false, message: 'This session code has been deactivated' })
    }
    if (now < validityStart) {
      return res.status(400).json({ success: false, message: 'This session code is not yet active' })
    }
    if (now > validityEnd) {
      return res.status(400).json({ success: false, message: 'This session code has expired' })
    }

    const supabase = getSupabaseApiClient(req, res)

    // Check that the username is still available
    const { data: existingStudent } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('username', username)
      .eq('session_code_id', sessionCodeData.id)
      .maybeSingle()

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'This username has already been taken. Please try a different one.',
      })
    }

    // Create the student account
    const passwordHash = await bcrypt.hash(password, 10)

    const { data: newStudent, error: createError } = await supabase
      .from('student_profiles')
      .insert({
        username,
        password_hash: passwordHash,
        session_code_id: sessionCodeData.id,
        display_name: username,
        email: email.toLowerCase().trim(),
        last_login: new Date().toISOString(),
      } as any)
      .select()
      .maybeSingle() as { data: StudentProfile | null, error: any }

    if (createError || !newStudent) {
      console.error('Error creating student:', createError)
      return res.status(500).json({
        success: false,
        message: 'Failed to create student account',
      })
    }

    // Create initial game save for new student
    const { error: saveError } = await supabase
      .from('game_saves')
      .insert({
        student_profile_id: newStudent.id,
        game_state: {
          grids: [],
          entities: [],
          globalResources: { wheat: 0, energy: 100 },
          codeWindows: [],
          questProgress: {},
        },
        save_name: 'autosave',
      } as any)

    if (saveError) {
      console.error('Error creating initial save:', saveError)
    }

    // Set session cookie
    const securePart = process.env.NODE_ENV === 'production' ? ' Secure;' : ''
    res.setHeader('Set-Cookie', `student_session_id=${newStudent.id}; Path=/; HttpOnly;${securePart} SameSite=Strict; Max-Age=2592000`)

    console.log(`[OTP] Account created for ${username} (verified via ${email})`)

    return res.status(200).json({
      success: true,
      message: 'Account created and logged in successfully',
      student: {
        id: newStudent.id,
        username: newStudent.username,
        displayName: newStudent.display_name,
        sessionCodeId: newStudent.session_code_id,
      },
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred during verification',
    })
  }
}
