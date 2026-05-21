// API route to batch-update quest progress (student only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type QuestProgressUpdate = {
  questId: string
  questTitle?: string
  state: 'locked' | 'available' | 'active' | 'completed' | 'failed'
  currentPhaseIndex?: number
  startedAt?: string
  completedAt?: string
  timeSpentSeconds?: number
  attempts?: number
  score?: number
  phaseProgress?: any
}

type BatchResponse = {
  success: boolean
  message?: string
  count?: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const studentSessionId = req.cookies.student_session_id
    if (!studentSessionId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - Student session required' })
    }

    const entries: QuestProgressUpdate[] = req.body?.entries
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'entries array is required' })
    }

    const supabase = getSupabaseApiClient(req, res)

    // Verify student
    const { data: student, error: studentError } = await supabase
      .from('student_profiles')
      .select('id, session_code_id')
      .eq('id', studentSessionId)
      .single() as { data: { id: string; session_code_id: string | null } | null; error: any }

    if (studentError || !student) {
      return res.status(401).json({ success: false, message: 'Invalid student session' })
    }

    // Get active session_code_id
    let activeSessionCodeId = student.session_code_id
    const { data: activeSession } = await (supabase
      .from('student_sessions') as any)
      .select('session_code_id')
      .eq('student_profile_id', studentSessionId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (activeSession) activeSessionCodeId = activeSession.session_code_id

    // Build upsert rows
    const rows = entries.map((entry) => ({
      student_profile_id: studentSessionId,
      session_code_id: activeSessionCodeId,
      quest_id: entry.questId,
      quest_title: entry.questTitle,
      state: entry.state,
      current_phase_index: entry.currentPhaseIndex ?? 0,
      started_at: entry.startedAt,
      completed_at: entry.completedAt,
      time_spent_seconds: entry.timeSpentSeconds ?? 0,
      attempts: entry.attempts ?? 0,
      score: entry.score,
      phase_progress: entry.phaseProgress ?? {},
    }))

    // Batch upsert
    const { error: upsertError } = await supabase
      .from('quest_progress')
      .upsert(rows as any, { onConflict: 'student_profile_id,quest_id' })

    if (upsertError) {
      console.error('Batch quest progress error:', upsertError)
      return res.status(500).json({ success: false, message: 'Failed to batch update quest progress' })
    }

    return res.status(200).json({
      success: true,
      message: `Batch updated ${rows.length} quest progress entries`,
      count: rows.length,
    })
  } catch (error) {
    console.error('Batch quest progress error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
