// API route to get all students for a specific session code (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminAuth'

type StudentInfo = {
  id: string
  username: string
  displayName: string | null
  joinedAt: string
  lastLogin: string | null
  questsCompleted: number
  questsActive: number
  totalTimeSpentSeconds: number
  totalCodeExecutions: number
  lastSaveTime: string | null
}

type StudentsResponse = {
  success: boolean
  message?: string
  students?: StudentInfo[]
  sessionCode?: {
    id: string
    code: string
    validityEnd: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StudentsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  // Check admin authentication
  const admin = await requireAdmin(req, res);
  if (!admin) {
    // Response already sent by requireAdmin
    return;
  }

  try {
    const { code } = req.query

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Session code is required',
      })
    }

    const supabase = getSupabaseAdminClient()

    // Get session code info with admin ownership
    const { data: sessionCodeData, error: codeError } = await supabase
      .from('session_codes')
      .select('id, code, validity_end, created_by_admin_id')
      .eq('code', code)
      .single()

    if (codeError || !sessionCodeData) {
      return res.status(404).json({
        success: false,
        message: 'Session code not found',
      })
    }

    // Verify ownership for non-super admins
    if (admin.role !== 'super_admin' && sessionCodeData.created_by_admin_id !== admin.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view students for this session code',
      })
    }

    // Get students for this session code using the progress summary view
    const { data: students, error: studentsError } = await supabase
      .from('student_progress_summary')
      .select('*')
      .eq('session_code_id', sessionCodeData.id)
      .order('joined_at', { ascending: true })

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students',
      })
    }

    const formattedStudents: StudentInfo[] = students.map((student) => ({
      id: student.student_profile_id,
      username: student.username,
      displayName: student.display_name,
      joinedAt: student.joined_at,
      lastLogin: student.last_login,
      questsCompleted: student.quests_completed || 0,
      questsActive: student.quests_active || 0,
      totalTimeSpentSeconds: student.total_time_spent_seconds || 0,
      totalCodeExecutions: student.total_code_executions || 0,
      lastSaveTime: student.last_save_time,
    }))

    return res.status(200).json({
      success: true,
      students: formattedStudents,
      sessionCode: {
        id: sessionCodeData.id,
        code: sessionCodeData.code,
        validityEnd: sessionCodeData.validity_end,
      },
    })
  } catch (error) {
    console.error('Get students error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching students',
    })
  }
}
