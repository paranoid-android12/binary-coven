// API route to get detailed student analytics (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminAuth'

type StudentAnalytics = {
  profile: {
    id: string
    username: string
    displayName: string | null
    sessionCode: string
    joinedAt: string
    lastLogin: string | null
  }
  summary: {
    questsCompleted: number
    questsActive: number
    totalTimeSpentSeconds: number
    totalCodeExecutions: number
    lastSaveTime: string | null
  }
  questProgress: Array<{
    questId: string
    questTitle: string | null
    state: string
    currentPhaseIndex: number
    startedAt: string | null
    completedAt: string | null
    timeSpentSeconds: number
    attempts: number
  }>
  objectiveProgress: Array<{
    questId: string
    phaseId: string
    objectiveIndex: number
    objectiveDescription: string | null
    completedAt: string | null
    attempts: number
    timeSpentSeconds: number
  }>
  recentCodeExecutions: Array<{
    id: string
    questId: string | null
    phaseId: string | null
    codeContent: string
    executionResult: any
    executedAt: string
  }>
}

type StudentAnalyticsResponse = {
  success: boolean
  message?: string
  analytics?: StudentAnalytics
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StudentAnalyticsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  // Check admin authentication
  const admin = await requireAdmin(req, res)
  if (!admin) {
    // Response already sent by requireAdmin
    return
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      })
    }

    const supabase = getSupabaseAdminClient()

    // Get student profile with session code
    const { data: studentProfile, error: profileError } = await supabase
      .from('student_profiles')
      .select(`
        id,
        username,
        display_name,
        created_at,
        last_login,
        session_codes (
          code
        )
      `)
      .eq('id', id)
      .single()

    if (profileError || !studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      })
    }

    // Get summary from view
    const { data: summary } = await supabase
      .from('student_progress_summary')
      .select('*')
      .eq('student_profile_id', id)
      .single()

    // Get detailed quest progress
    const { data: questProgress } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('student_profile_id', id)
      .order('started_at', { ascending: false })

    // Get objective progress
    const { data: objectiveProgress } = await supabase
      .from('objective_progress')
      .select('*')
      .eq('student_profile_id', id)
      .order('completed_at', { ascending: false })

    // Get recent code executions (last 50)
    const { data: codeExecutions } = await supabase
      .from('code_executions')
      .select('id, quest_id, phase_id, code_content, execution_result, executed_at')
      .eq('student_profile_id', id)
      .order('executed_at', { ascending: false })
      .limit(50)

    const analytics: StudentAnalytics = {
      profile: {
        id: studentProfile.id,
        username: studentProfile.username,
        displayName: studentProfile.display_name,
        sessionCode: (studentProfile as any).session_codes?.code || 'Unknown',
        joinedAt: studentProfile.created_at,
        lastLogin: studentProfile.last_login,
      },
      summary: {
        questsCompleted: summary?.quests_completed || 0,
        questsActive: summary?.quests_active || 0,
        totalTimeSpentSeconds: summary?.total_time_spent_seconds || 0,
        totalCodeExecutions: summary?.total_code_executions || 0,
        lastSaveTime: summary?.last_save_time || null,
      },
      questProgress: (questProgress || []).map((qp) => ({
        questId: qp.quest_id,
        questTitle: qp.quest_title,
        state: qp.state,
        currentPhaseIndex: qp.current_phase_index,
        startedAt: qp.started_at,
        completedAt: qp.completed_at,
        timeSpentSeconds: qp.time_spent_seconds,
        attempts: qp.attempts,
      })),
      objectiveProgress: (objectiveProgress || []).map((op) => ({
        questId: op.quest_id,
        phaseId: op.phase_id,
        objectiveIndex: op.objective_index,
        objectiveDescription: op.objective_description,
        completedAt: op.completed_at,
        attempts: op.attempts,
        timeSpentSeconds: op.time_spent_seconds,
      })),
      recentCodeExecutions: (codeExecutions || []).map((ce) => ({
        id: ce.id,
        questId: ce.quest_id,
        phaseId: ce.phase_id,
        codeContent: ce.code_content,
        executionResult: ce.execution_result,
        executedAt: ce.executed_at,
      })),
    }

    return res.status(200).json({
      success: true,
      analytics,
    })
  } catch (error) {
    console.error('Get student analytics error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching student analytics',
    })
  }
}
