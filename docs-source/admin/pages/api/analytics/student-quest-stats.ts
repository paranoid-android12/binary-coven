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
    const { data: activeSession } = await (supabase.from('student_sessions') as any)
      .select('session_code_id')
      .eq('student_profile_id', studentSessionId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single()
    if (activeSession) activeSessionCodeId = activeSession.session_code_id

    // Fetch code executions for this student in the active session
    let executionsQuery = supabase
      .from('code_executions')
      .select('quest_id, execution_result, execution_duration_ms')
      .eq('student_profile_id', studentSessionId)
      .not('quest_id', 'is', null)
    
    if (activeSessionCodeId) {
      executionsQuery = executionsQuery.eq('session_code_id', activeSessionCodeId)
    }

    const { data: executions, error: executionsError } = await executionsQuery

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
