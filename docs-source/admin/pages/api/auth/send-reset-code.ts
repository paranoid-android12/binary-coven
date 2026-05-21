// API route: Send password reset code to user's registered email
import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { generateOtp, storeOtp } from '@/lib/otpStore'

type SendResetCodeResponse = {
  success: boolean
  message: string
  maskedEmail?: string
  cooldownRemaining?: number
}

function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587')
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/** Mask email: "robinx@gmail.com" → "r****x@gmail.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendResetCodeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { username, sessionCode } = req.body

    if (!username || !sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'Username and session code are required',
      })
    }

    const adminSupabase = getSupabaseAdminClient()

    // Look up the student by username (global lookup)
    const { data: student, error: studentError } = await adminSupabase
      .from('student_profiles')
      .select('id, email')
      .eq('username', username.trim())
      .maybeSingle() as { data: { id: string, email: string | null } | null, error: any }

    if (studentError || !student) {
      return res.status(400).json({
        success: false,
        message: 'No account found with this username',
      })
    }

    if (!student.email) {
      return res.status(400).json({
        success: false,
        message: 'No email is associated with this account. Please contact your teacher.',
      })
    }

    // Generate and store OTP (reuses the same store — keyed by email)
    const otpCode = generateOtp()
    const storeResult = await storeOtp(student.email, otpCode)

    if (!storeResult.success) {
      return res.status(429).json({
        success: false,
        message: storeResult.message,
        maskedEmail: maskEmail(student.email),
        cooldownRemaining: storeResult.cooldownRemaining,
      })
    }

    // Send reset email
    const transporter = createTransporter()

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Binary Coven" <noreply@binarycoven.com>',
      to: student.email,
      subject: 'Binary Coven — Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; background: #f5e6d3; border: 3px solid #210714; border-radius: 12px;">
          <h1 style="color: #210714; text-align: center; font-size: 28px; margin-bottom: 5px;">🔮 Binary Coven</h1>
          <p style="color: #210714; text-align: center; font-size: 14px; opacity: 0.7; margin-top: 0;">Password Reset</p>
          <hr style="border: 1px solid rgba(33, 7, 20, 0.2); margin: 20px 0;">
          <p style="color: #210714; font-size: 16px;">Hi <strong>${username}</strong>,</p>
          <p style="color: #210714; font-size: 16px;">Use this code to reset your password:</p>
          <div style="background: #210714; color: #d8a888; font-size: 36px; letter-spacing: 12px; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: monospace;">
            ${otpCode}
          </div>
          <p style="color: #210714; font-size: 14px; opacity: 0.7;">This code expires in <strong>5 minutes</strong>.</p>
          <p style="color: #210714; font-size: 14px; opacity: 0.7;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    })

    return res.status(200).json({
      success: true,
      message: 'Password reset code sent',
      maskedEmail: maskEmail(student.email),
    })
  } catch (error) {
    console.error('Send reset code error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to send reset code. Please try again.',
    })
  }
}
