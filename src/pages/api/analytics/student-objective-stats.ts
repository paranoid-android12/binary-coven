// API route to get objective completion statistics for logged-in student
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type ObjectiveStats = {
  objectivesCompleted: number;
  totalTimeSpent: number;      // in seconds
  totalAttempts: number;
  totalHintsUsed: number;
  avgTimePerObjective: number; // in seconds
}

type ObjectiveStatsResponse = {
  success: boolean
  message?: string
  stats?: ObjectiveStats
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ObjectiveStatsResponse>
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
      .select('id')
      .eq('id', studentSessionId)
      .single()

    if (studentError || !student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student session',
      })
    }

    // Fetch all completed objectives for this student
    const { data: objectives, error: objectivesError } = await supabase
      .from('objective_progress')
      .select('attempts, time_spent_seconds, hints_used')
      .eq('student_profile_id', studentSessionId)
      .not('completed_at', 'is', null)

    if (objectivesError) {
      console.error('Error fetching objectives:', objectivesError)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch objective statistics',
      })
    }

    // Calculate aggregate stats
    const completedCount = objectives?.length || 0;
    
    if (completedCount === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          objectivesCompleted: 0,
          totalTimeSpent: 0,
          totalAttempts: 0,
          totalHintsUsed: 0,
          avgTimePerObjective: 0,
        },
      })
    }

    let totalTime = 0;
    let totalAttempts = 0;
    let totalHints = 0;

    (objectives || []).forEach((obj: any) => {
      totalTime += obj.time_spent_seconds || 0;
      totalAttempts += obj.attempts || 0;
      totalHints += obj.hints_used || 0;
    });

    const stats: ObjectiveStats = {
      objectivesCompleted: completedCount,
      totalTimeSpent: totalTime,
      totalAttempts: totalAttempts,
      totalHintsUsed: totalHints,
      avgTimePerObjective: completedCount > 0 ? Math.round(totalTime / completedCount) : 0,
    };

    return res.status(200).json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get objective stats error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching objective statistics',
    })
  }
}
