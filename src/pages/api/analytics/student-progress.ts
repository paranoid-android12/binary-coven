// API route to get quest progress for logged-in student
// Returns all quest progress data from database (not localStorage)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type QuestProgressItem = {
  questId: string;
  questTitle: string;
  state: 'locked' | 'available' | 'active' | 'completed' | 'failed';
  currentPhaseIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  timeSpentSeconds: number;
  attempts: number;
  score: number | null;
}

type StudentProgressResponse = {
  success: boolean
  message?: string
  questProgress?: QuestProgressItem[]
  summary?: {
    totalQuests: number;
    completedQuests: number;
    inProgressQuests: number;
    totalTimeSpentSeconds: number;
    totalAttempts: number;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StudentProgressResponse>
) {
  // Security headers - prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseApiClient(req, res)

    // Get student session ID from cookie
    const studentSessionId = req.cookies['student_session_id']
    if (!studentSessionId) {
      return res.status(401).json({
        success: false,
        message: 'Student authentication required',
      })
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('student_profiles')
      .select('id, session_code_id')
      .eq('id', studentSessionId)
      .single() as { data: { id: string; session_code_id: string | null } | null; error: any }

    if (studentError || !student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student session',
      })
    }

    // Get active session_code_id from student_sessions (fall back to legacy field)
    let activeSessionCodeId = student.session_code_id
    const { data: activeSession } = await (supabase.from('student_sessions') as any)
      .select('session_code_id')
      .eq('student_profile_id', studentSessionId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single()
    if (activeSession) activeSessionCodeId = activeSession.session_code_id

    // Fetch quest progress for this student in the active session
    let progressQuery = supabase
      .from('quest_progress')
      .select(`
        quest_id,
        quest_title,
        state,
        current_phase_index,
        started_at,
        completed_at,
        time_spent_seconds,
        attempts,
        score
      `)
      .eq('student_profile_id', studentSessionId)
    
    if (activeSessionCodeId) {
      progressQuery = progressQuery.eq('session_code_id', activeSessionCodeId)
    }

    const { data: progressData, error: progressError } = await progressQuery
      .order('completed_at', { ascending: false, nullsFirst: false })

    if (progressError) {
      console.error('Error fetching quest progress:', progressError)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quest progress',
      })
    }

    // Transform to response format
    const questProgress: QuestProgressItem[] = (progressData || []).map((item: any) => ({
      questId: item.quest_id,
      questTitle: item.quest_title || '',
      state: item.state,
      currentPhaseIndex: item.current_phase_index || 0,
      startedAt: item.started_at,
      completedAt: item.completed_at,
      timeSpentSeconds: item.time_spent_seconds || 0,
      attempts: item.attempts || 0,
      score: item.score,
    }))

    // Calculate summary statistics
    const completedQuests = questProgress.filter(q => q.state === 'completed').length;
    const inProgressQuests = questProgress.filter(q => q.state === 'active').length;
    const totalTimeSpentSeconds = questProgress.reduce((sum, q) => sum + q.timeSpentSeconds, 0);
    const totalAttempts = questProgress.reduce((sum, q) => sum + q.attempts, 0);

    return res.status(200).json({
      success: true,
      questProgress,
      summary: {
        totalQuests: questProgress.length,
        completedQuests,
        inProgressQuests,
        totalTimeSpentSeconds,
        totalAttempts,
      }
    })

  } catch (error) {
    console.error('Student progress error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching progress',
    })
  }
}
