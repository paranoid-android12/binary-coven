// API route for logout (both student and admin)
import type { NextApiRequest, NextApiResponse } from 'next'

type LogoutResponse = {
  success: boolean
  message: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogoutResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    // Clear all session cookies
    res.setHeader('Set-Cookie', [
      'admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      'student_session_id=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    ])

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred during logout',
    })
  }
}
