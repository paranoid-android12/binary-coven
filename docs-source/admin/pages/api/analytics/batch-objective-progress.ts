// API route to batch-update objective progress (student only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type ObjectiveProgressUpdate = {
  questId: string
  phaseId: string
  objectiveIndex: number
  objectiveDescription?: string
  completedAt?: string
  attempts?: number
  timeSpentSeconds?: number
  hintsUsed?: number
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

    const entries: ObjectiveProgressUpdate[] = req.body?.entries
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
      phase_id: entry.phaseId,
      objective_index: entry.objectiveIndex,
      objective_description: entry.objectiveDescription,
      completed_at: entry.completedAt,
      attempts: entry.attempts ?? 0,
      time_spent_seconds: entry.timeSpentSeconds ?? 0,
      hints_used: entry.hintsUsed ?? 0,
    }))

    // Batch upsert
    const { error: upsertError } = await supabase
      .from('objective_progress')
      .upsert(rows as any, { onConflict: 'student_profile_id,quest_id,phase_id,objective_index' })

    if (upsertError) {
      console.error('Batch objective progress error:', upsertError)
      return res.status(500).json({ success: false, message: 'Failed to batch update objective progress' })
    }

    return res.status(200).json({
      success: true,
      message: `Batch updated ${rows.length} objective progress entries`,
      count: rows.length,
    })
  } catch (error) {
    console.error('Batch objective progress error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
