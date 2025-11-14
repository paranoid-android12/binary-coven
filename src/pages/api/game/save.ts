// API route to save game state (student only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type SaveGameRequest = {
  gameState: any // Complete game state object
  saveName?: string // Optional save name (default: 'autosave')
}

type SaveGameResponse = {
  success: boolean
  message?: string
  savedAt?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveGameResponse>
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

    const { gameState, saveName = 'autosave' }: SaveGameRequest = req.body

    if (!gameState) {
      return res.status(400).json({
        success: false,
        message: 'Game state is required',
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

    const now = new Date().toISOString()

    // Upsert game save (insert or update if exists)
    const { error: saveError } = await supabase
      .from('game_saves')
      .upsert(
        {
          student_profile_id: studentSessionId,
          game_state: gameState,
          save_name: saveName,
          last_saved: now,
          save_version: 1,
        },
        {
          onConflict: 'student_profile_id,save_name',
        }
      )

    if (saveError) {
      console.error('Error saving game:', saveError)
      return res.status(500).json({
        success: false,
        message: 'Failed to save game',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Game saved successfully',
      savedAt: now,
    })
  } catch (error) {
    console.error('Save game error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while saving game',
    })
  }
}
