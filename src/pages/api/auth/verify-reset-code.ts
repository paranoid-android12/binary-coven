// API route: Verify OTP reset code without consuming it
// Used to validate the code before showing the new password form
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { checkOtp } from '@/lib/otpStore'

type VerifyResetCodeResponse = {
  success: boolean
  message: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyResetCodeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { otp, username, sessionCode } = req.body

    if (!otp || !username || !sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    const adminSupabase = getSupabaseAdminClient()

    // Verify session code (including validity window and active status)
    const { data: sessionCodeData } = await adminSupabase
      .from('session_codes')
      .select('id, validity_start, validity_end, is_active')
      .eq('code', sessionCode.trim())
      .maybeSingle() as { data: { id: string; validity_start: string; validity_end: string; is_active: boolean } | null, error: any }

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

    // Find the student
    const { data: student } = await adminSupabase
      .from('student_profiles')
      .select('id, email')
      .eq('username', username.trim())
      .eq('session_code_id', sessionCodeData.id)
      .maybeSingle() as { data: { id: string, email: string | null } | null, error: any }

    if (!student || !student.email) {
      return res.status(400).json({
        success: false,
        message: 'Account verification failed',
      })
    }

    // Check OTP without consuming it
    const otpResult = await checkOtp(student.email, otp)
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Code verified successfully',
    })
  } catch (error) {
    console.error('Verify reset code error:', error)
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    })
  }
}
