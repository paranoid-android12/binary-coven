// API route to get quest execution statistics for logged-in student
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type QuestExecutionStats = {
  questId: string;
  totalAttempts: number;      // Total code executions
  successfulRuns: number;     // Successful executions
  failedRuns: number;         // Failed executions
  avgExecutionTime: number;   // Average duration in ms
}

type QuestStatsResponse = {
  success: boolean
  message?: string
  stats?: QuestExecutionStats[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuestStatsResponse>
) {
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

    // Fetch all code executions for this student
    const { data: executions, error: executionsError } = await supabase
      .from('code_executions')
      .select('quest_id, execution_result, execution_duration_ms')
      .eq('student_profile_id', studentSessionId)
      .not('quest_id', 'is', null)

    if (executionsError) {
      console.error('Error fetching code executions:', executionsError)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch execution statistics',
      })
    }

    // Aggregate statistics per quest
    const questStatsMap = new Map<string, {
      totalAttempts: number;
      successfulRuns: number;
      failedRuns: number;
      totalExecutionTime: number;
    }>();

    (executions || []).forEach((execution: any) => {
      const questId = execution.quest_id;
      if (!questId) return;

      if (!questStatsMap.has(questId)) {
        questStatsMap.set(questId, {
          totalAttempts: 0,
          successfulRuns: 0,
          failedRuns: 0,
          totalExecutionTime: 0,
        });
      }

      const stats = questStatsMap.get(questId)!;
      stats.totalAttempts++;

      // Check if execution was successful
      const isSuccess = execution.execution_result?.success === true;
      if (isSuccess) {
        stats.successfulRuns++;
      } else {
        stats.failedRuns++;
      }

      // Add execution time
      if (execution.execution_duration_ms) {
        stats.totalExecutionTime += execution.execution_duration_ms;
      }
    });

    // Convert map to array and calculate averages
    const stats: QuestExecutionStats[] = Array.from(questStatsMap.entries()).map(([questId, data]) => ({
      questId,
      totalAttempts: data.totalAttempts,
      successfulRuns: data.successfulRuns,
      failedRuns: data.failedRuns,
      avgExecutionTime: data.totalAttempts > 0 
        ? Math.round(data.totalExecutionTime / data.totalAttempts) 
        : 0,
    }));

    return res.status(200).json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get quest stats error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching quest statistics',
    })
  }
}
