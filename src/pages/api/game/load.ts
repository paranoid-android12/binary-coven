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
      .select('id')
      .eq('id', studentSessionId)
      .single()

    if (studentError || !student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student session',
      })
    }

    // Get game save
    const { data: gameSave, error: loadError } = await supabase
      .from('game_saves')
      .select('game_state, last_saved')
      .eq('student_profile_id', studentSessionId)
      .eq('save_name', saveName)
      .single()

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
