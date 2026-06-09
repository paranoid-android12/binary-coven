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

    // Fetch ALL quest progress for this student across EVERY session. A
    // student's progress and topic mastery are an overall learning journey —
    // this matches the admin student view, which aggregates cross-session.
    // Previously this was scoped to the active session, so completions earned
    // in an earlier session vanished from "My Progress" even though the
    // database (and admin panel) still had them.
    const { data: progressData, error: progressError } = await supabase
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
      .order('completed_at', { ascending: false, nullsFirst: false })

    if (progressError) {
      console.error('Error fetching quest progress:', progressError)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quest progress',
      })
    }

    // The same quest can have rows in multiple sessions — collapse to one entry
    // per quest, keeping the most-advanced state (completed > active > …), and
    // on ties the most recent / richest record.
    const STATE_RANK: Record<string, number> = {
      locked: 0, available: 1, active: 2, failed: 3, completed: 4,
    }
    const bestByQuest = new Map<string, any>()
    for (const item of ((progressData || []) as any[])) {
      const existing = bestByQuest.get(item.quest_id)
      if (!existing) { bestByQuest.set(item.quest_id, item); continue }
      const rankNew = STATE_RANK[item.state] ?? 0
      const rankOld = STATE_RANK[existing.state] ?? 0
      if (rankNew > rankOld) {
        bestByQuest.set(item.quest_id, item)
      } else if (rankNew === rankOld) {
        const tNew = new Date(item.completed_at || item.started_at || 0).getTime()
        const tOld = new Date(existing.completed_at || existing.started_at || 0).getTime()
        if (tNew > tOld) bestByQuest.set(item.quest_id, item)
      }
    }

    // Transform to response format
    const questProgress: QuestProgressItem[] = Array.from(bestByQuest.values()).map((item: any) => ({
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
