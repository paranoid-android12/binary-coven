// API route to reset game state (student only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type ResetGameResponse = {
  success: boolean
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResetGameResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    // Get student session
    const studentSessionId = req.cookies.student_session_id

    if (!studentSessionId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Student session required',
      })
    }

    const supabase = getSupabaseApiClient(req, res)

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
    const { data: activeSession } = await (supabase
      .from('student_sessions') as any)
      .select('session_code_id')
      .eq('student_profile_id', studentSessionId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (activeSession) activeSessionCodeId = activeSession.session_code_id

    // Build session filter helper — scopes deletions to active session when possible
    const withSessionScope = (query: any) => {
      if (activeSessionCodeId) {
        return query.eq('session_code_id', activeSessionCodeId)
      }
      return query
    }

    // Delete game saves for this student in this session
    const { error: deleteSaveError } = await withSessionScope(
      supabase.from('game_saves').delete().eq('student_profile_id', studentSessionId)
    )

    if (deleteSaveError) {
      console.error('Error deleting game saves:', deleteSaveError)
    }

    // Delete quest progress for this session
    const { error: deleteQuestError } = await withSessionScope(
      supabase.from('quest_progress').delete().eq('student_profile_id', studentSessionId)
    )

    if (deleteQuestError) {
      console.error('Error deleting quest progress:', deleteQuestError)
    }

    // Delete objective progress for this session
    const { error: deleteObjectiveError } = await withSessionScope(
      supabase.from('objective_progress').delete().eq('student_profile_id', studentSessionId)
    )

    if (deleteObjectiveError) {
      console.error('Error deleting objective progress:', deleteObjectiveError)
    }

    // Delete code executions for this session
    const { error: deleteCodeError } = await withSessionScope(
      supabase.from('code_executions').delete().eq('student_profile_id', studentSessionId)
    )

    if (deleteCodeError) {
      console.error('Error deleting code executions:', deleteCodeError)
    }

    // Delete learning events for this session
    const { error: deleteEventsError } = await withSessionScope(
      supabase.from('learning_events').delete().eq('student_profile_id', studentSessionId)
    )

    if (deleteEventsError) {
      console.error('Error deleting learning events:', deleteEventsError)
    }

    // Create a fresh initial game save for this session
    const { error: createSaveError } = await supabase
      .from('game_saves')
      .insert({
        student_profile_id: studentSessionId,
        session_code_id: activeSessionCodeId,
        game_state: {
          grids: [],
          entities: [],
          globalResources: { wheat: 0, energy: 100 },
          codeWindows: [],
          questProgress: {},
        },
        save_name: 'autosave',
      } as any)

    if (createSaveError) {
      console.error('Error creating initial save:', createSaveError)
    }

    return res.status(200).json({
      success: true,
      message: 'Game reset successfully - all progress cleared',
    })
  } catch (error) {
    console.error('Reset game error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while resetting game',
    })
  }
}
