// API route to track objective-level progress (student only)
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

type ObjectiveProgressResponse = {
  success: boolean
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ObjectiveProgressResponse>
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

    const progressUpdate: ObjectiveProgressUpdate = req.body

    if (!progressUpdate.questId || !progressUpdate.phaseId || progressUpdate.objectiveIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Quest ID, phase ID, and objective index are required',
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

    // Upsert objective progress
    const { error: upsertError } = await supabase
      .from('objective_progress')
      .upsert(
        {
          student_profile_id: studentSessionId,
          quest_id: progressUpdate.questId,
          phase_id: progressUpdate.phaseId,
          objective_index: progressUpdate.objectiveIndex,
          objective_description: progressUpdate.objectiveDescription,
          completed_at: progressUpdate.completedAt,
          attempts: progressUpdate.attempts ?? 0,
          time_spent_seconds: progressUpdate.timeSpentSeconds ?? 0,
          hints_used: progressUpdate.hintsUsed ?? 0,
        },
        {
          onConflict: 'student_profile_id,quest_id,phase_id,objective_index',
        }
      )

    if (upsertError) {
      console.error('Error updating objective progress:', upsertError)
      return res.status(500).json({
        success: false,
        message: 'Failed to update objective progress',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Objective progress updated successfully',
    })
  } catch (error) {
    console.error('Objective progress error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating objective progress',
    })
  }
}
