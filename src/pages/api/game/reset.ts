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
      .select('id')
      .eq('id', studentSessionId)
      .single()

    if (studentError || !student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student session',
      })
    }

    // Delete all game saves for this student
    const { error: deleteSaveError } = await supabase
      .from('game_saves')
      .delete()
      .eq('student_profile_id', studentSessionId)

    if (deleteSaveError) {
      console.error('Error deleting game saves:', deleteSaveError)
    }

    // Delete all quest progress
    const { error: deleteQuestError } = await supabase
      .from('quest_progress')
      .delete()
      .eq('student_profile_id', studentSessionId)

    if (deleteQuestError) {
      console.error('Error deleting quest progress:', deleteQuestError)
    }

    // Delete all objective progress
    const { error: deleteObjectiveError } = await supabase
      .from('objective_progress')
      .delete()
      .eq('student_profile_id', studentSessionId)

    if (deleteObjectiveError) {
      console.error('Error deleting objective progress:', deleteObjectiveError)
    }

    // Delete all code executions
    const { error: deleteCodeError } = await supabase
      .from('code_executions')
      .delete()
      .eq('student_profile_id', studentSessionId)

    if (deleteCodeError) {
      console.error('Error deleting code executions:', deleteCodeError)
    }

    // Delete all learning events
    const { error: deleteEventsError } = await supabase
      .from('learning_events')
      .delete()
      .eq('student_profile_id', studentSessionId)

    if (deleteEventsError) {
      console.error('Error deleting learning events:', deleteEventsError)
    }

    // Create a fresh initial game save
    const { error: createSaveError } = await supabase
      .from('game_saves')
      .insert({
        student_profile_id: studentSessionId,
        game_state: {
          grids: [],
          entities: [],
          globalResources: { wheat: 0, energy: 100 },
          codeWindows: [],
          questProgress: {},
        },
        save_name: 'autosave',
      })

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
