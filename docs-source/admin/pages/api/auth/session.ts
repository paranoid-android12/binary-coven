// API route to get current session info
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'
import { verifyAdminSession } from '@/lib/auth/adminAuth'

type SessionResponse = {
  authenticated: boolean
  userType?: 'student' | 'admin'
  user?: {
    id: string
    username?: string
    displayName?: string
    sessionCodeId?: string
    email?: string | null
    role?: 'super_admin' | 'admin'
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
    const adminSessionId = req.cookies.admin_session

    if (adminSessionId) {
      const adminUser = await verifyAdminSession(adminSessionId)

      if (adminUser) {
        return res.status(200).json({
          authenticated: true,
          userType: 'admin',
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role,
          },
        })
      }
      // If session ID is invalid or admin is inactive, continue to check student session
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
      .single() as { data: { id: string; username: string; display_name: string | null; session_code_id: string | null } | null; error: any }

    if (error || !studentData) {
      return res.status(200).json({
        authenticated: false,
      })
    }

    // Get the active session from student_sessions (most recently joined)
    // Falls back to legacy session_code_id on the profile
    let activeSessionCodeId = studentData.session_code_id

    const { data: activeSession } = await (supabase
      .from('student_sessions') as any)
      .select('session_code_id')
      .eq('student_profile_id', studentData.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSession) {
      activeSessionCodeId = activeSession.session_code_id
    }

    return res.status(200).json({
      authenticated: true,
      userType: 'student',
      user: {
        id: studentData.id,
        username: studentData.username,
        displayName: studentData.display_name ?? undefined,
        sessionCodeId: activeSessionCodeId ?? undefined,
      },
    })
  } catch (error) {
    console.error('Session check error:', error)
    return res.status(500).json({
      authenticated: false,
    })
  }
}
