// API route to get current session info
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type SessionResponse = {
  authenticated: boolean
  userType?: 'student' | 'admin'
  user?: {
    id: string
    username?: string
    displayName?: string
    sessionCodeId?: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      authenticated: false,
    })
  }

  try {
    // Check for admin session first
    const adminSession = req.cookies.admin_session

    if (adminSession === 'true') {
      return res.status(200).json({
        authenticated: true,
        userType: 'admin',
        user: {
          id: 'admin',
        },
      })
    }

    // Check for student session
    const studentSessionId = req.cookies.student_session_id

    if (!studentSessionId) {
      return res.status(200).json({
        authenticated: false,
      })
    }

    // Verify student session
    const supabase = getSupabaseApiClient(req, res)

    const { data: studentData, error } = await supabase
      .from('student_profiles')
      .select('id, username, display_name, session_code_id')
      .eq('id', studentSessionId)
      .single()

    if (error || !studentData) {
      return res.status(200).json({
        authenticated: false,
      })
    }

    return res.status(200).json({
      authenticated: true,
      userType: 'student',
      user: {
        id: studentData.id,
        username: studentData.username,
        displayName: studentData.display_name,
        sessionCodeId: studentData.session_code_id,
      },
    })
  } catch (error) {
    console.error('Session check error:', error)
    return res.status(500).json({
      authenticated: false,
    })
  }
}
