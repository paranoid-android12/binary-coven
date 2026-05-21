// API route to load game state (student only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type LoadGameResponse = {
  success: boolean
  message?: string
  gameState?: any
  lastSaved?: string
  saveExists?: boolean
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoadGameResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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

    const { saveName = 'autosave' } = req.query

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

    // Get game save — prefer session-specific save, fall back to any save for this student
    let gameSave: { game_state: any, last_saved: string } | null = null
    let loadError = null

    if (activeSessionCodeId) {
      const result = await supabase
        .from('game_saves')
        .select('game_state, last_saved')
        .eq('student_profile_id', studentSessionId)
        .eq('session_code_id', activeSessionCodeId)
        .eq('save_name', saveName)
        .single() as { data: { game_state: any, last_saved: string } | null, error: any }
      gameSave = result.data
      loadError = result.error
    }

    // Fallback: try loading without session_code_id filter (legacy saves)
    if (!gameSave) {
      const result = await supabase
        .from('game_saves')
        .select('game_state, last_saved')
        .eq('student_profile_id', studentSessionId)
        .eq('save_name', saveName)
        .single() as { data: { game_state: any, last_saved: string } | null, error: any }
      gameSave = result.data
      loadError = result.error
    }

    if (loadError || !gameSave) {
      // No save exists - return empty state
      return res.status(200).json({
        success: true,
        message: 'No save found - starting fresh',
        saveExists: false,
        gameState: null,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Game loaded successfully',
      saveExists: true,
      gameState: gameSave.game_state,
      lastSaved: gameSave.last_saved,
    })
  } catch (error) {
    console.error('Load game error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while loading game',
    })
  }
}
