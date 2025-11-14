// API route to update quest progress (student only)
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

type QuestProgressResponse = {
  success: boolean
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuestProgressResponse>
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

    const progressUpdate: QuestProgressUpdate = req.body

    if (!progressUpdate.questId || !progressUpdate.state) {
      return res.status(400).json({
        success: false,
        message: 'Quest ID and state are required',
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

    // Upsert quest progress
    const { error: upsertError } = await supabase
      .from('quest_progress')
      .upsert(
        {
          student_profile_id: studentSessionId,
          quest_id: progressUpdate.questId,
          quest_title: progressUpdate.questTitle,
          state: progressUpdate.state,
          current_phase_index: progressUpdate.currentPhaseIndex ?? 0,
          started_at: progressUpdate.startedAt,
          completed_at: progressUpdate.completedAt,
          time_spent_seconds: progressUpdate.timeSpentSeconds ?? 0,
          attempts: progressUpdate.attempts ?? 0,
          score: progressUpdate.score,
          phase_progress: progressUpdate.phaseProgress ?? {},
        },
        {
          onConflict: 'student_profile_id,quest_id',
        }
      )

    if (upsertError) {
      console.error('Error updating quest progress:', upsertError)
      return res.status(500).json({
        success: false,
        message: 'Failed to update quest progress',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Quest progress updated successfully',
    })
  } catch (error) {
    console.error('Quest progress error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating quest progress',
    })
  }
}
