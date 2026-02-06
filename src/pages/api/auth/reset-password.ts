// API route: Verify reset code and update password
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyOtp } from '@/lib/otpStore'
import bcrypt from 'bcryptjs'

type ResetPasswordResponse = {
  success: boolean
  message: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResetPasswordResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { otp, newPassword, username, sessionCode } = req.body

    if (!otp || !newPassword || !username || !sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      })
    }

    // Look up the student to get their email
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

    // Verify OTP using the student's real email
    const otpResult = await verifyOtp(student.email, otp)
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      })
    }

    // Hash and update the password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const { error: updateError } = await (adminSupabase
      .from('student_profiles') as any)
      .update({ password_hash: hashedPassword })
      .eq('id', student.id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return res.status(500).json({
        success: false,
        message: 'Failed to update password. Please try again.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    })
  }
}
