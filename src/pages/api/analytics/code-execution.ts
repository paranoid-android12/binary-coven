// API route to log code execution (student only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient } from '@/lib/supabase/server'

type CodeExecutionLog = {
  questId?: string
  phaseId?: string
  codeWindowId?: string
  codeContent: string
  executionResult?: {
    success: boolean
    errors?: any[]
    output?: string
    executionTime?: number
  }
  entityId?: string
  executionDurationMs?: number
}

type CodeExecutionResponse = {
  success: boolean
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CodeExecutionResponse>
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

    const executionLog: CodeExecutionLog = req.body

    if (!executionLog.codeContent) {
      return res.status(400).json({
        success: false,
        message: 'Code content is required',
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

    // Insert code execution log
    const { error: insertError } = await supabase
      .from('code_executions')
      .insert({
        student_profile_id: studentSessionId,
        quest_id: executionLog.questId,
        phase_id: executionLog.phaseId,
        code_window_id: executionLog.codeWindowId,
        code_content: executionLog.codeContent,
        execution_result: executionLog.executionResult,
        entity_id: executionLog.entityId,
        execution_duration_ms: executionLog.executionDurationMs,
      })

    if (insertError) {
      console.error('Error logging code execution:', insertError)
      return res.status(500).json({
        success: false,
        message: 'Failed to log code execution',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Code execution logged successfully',
    })
  } catch (error) {
    console.error('Code execution logging error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while logging code execution',
    })
  }
}
