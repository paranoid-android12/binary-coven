// API route: Send OTP via email using nodemailer
import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'
import { generateOtp, storeOtp } from '@/lib/otpStore'

type SendOtpResponse = {
  success: boolean
  message: string
  cooldownRemaining?: number
}

// Create reusable nodemailer transporter
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendOtpResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' })
    }

    // Generate OTP
    const otpCode = generateOtp()

    // Try to store (respects 1-min resend cooldown)
    const storeResult = await storeOtp(email, otpCode)
    if (!storeResult.success) {
      return res.status(429).json({
        success: false,
        message: storeResult.message,
        cooldownRemaining: storeResult.cooldownRemaining,
      })
    }

    // Send email via nodemailer
    const transporter = createTransporter()

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Binary Coven - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background-color: #1a0a12; padding: 40px; border-radius: 12px;">
          <h1 style="color: #d8a888; text-align: center; font-size: 28px; margin-bottom: 8px;">
            Binary Coven
          </h1>
          <p style="color: #d8a888; text-align: center; font-size: 14px; opacity: 0.7; margin-bottom: 30px;">
            Student Portal Verification
          </p>
          <div style="background-color: #2a1520; border: 2px solid #d8a888; border-radius: 8px; padding: 30px; text-align: center;">
            <p style="color: #d8a888; font-size: 14px; margin-bottom: 20px;">
              Your verification code is:
            </p>
            <div style="background-color: #d8a888; color: #210714; font-size: 36px; font-weight: bold; letter-spacing: 12px; padding: 16px 24px; border-radius: 8px; display: inline-block;">
              ${otpCode}
            </div>
            <p style="color: #d8a888; font-size: 12px; margin-top: 20px; opacity: 0.6;">
              This code expires in 5 minutes.
            </p>
          </div>
          <p style="color: #d8a888; font-size: 11px; text-align: center; margin-top: 24px; opacity: 0.4;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    console.log(`[OTP] Sent verification code to ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`)

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
    })
  } catch (error) {
    console.error('[OTP] Error sending email:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to send verification email. Please try again.',
    })
  }
}
