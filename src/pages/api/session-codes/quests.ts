// API route to get quests assigned to a session code
// Used by game client to load only the quests assigned to the student's session
//
// Query parameters:
// - sessionCodeId: UUID of the session code (preferred, used by authenticated students)
// - sessionCode: The actual session code string (alternative lookup method)
//
// If both are provided, sessionCodeId takes precedence.
// Returns hasCustomQuests: false if no specific quests assigned (use all quests)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

type SessionQuestsResponse = {
  success: boolean
  message?: string
  quests?: {
    questId: string
    questOrder: number
    filePath: string
  }[]
  hasCustomQuests: boolean // true if session has specific quests, false if using all
}

// Type for session quest from database
type SessionQuestRow = {
  quest_id: string
  quest_order: number
}

// Type for session code lookup result
type SessionCodeRow = {
  id: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionQuestsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      hasCustomQuests: false,
    })
  }

  try {
    const { sessionCodeId, sessionCode } = req.query

    // Must provide either session code ID or code string
    if (!sessionCodeId && !sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'Session code ID or code is required',
        hasCustomQuests: false,
      })
    }

    const supabase = getSupabaseAdminClient()

    // If we have session code string, look up the ID first
    let codeId = sessionCodeId as string

    if (!codeId && sessionCode) {
      const { data: codeData, error: codeError } = await supabase
        .from('session_codes')
        .select('id')
        .eq('code', sessionCode)
        .single() as { data: SessionCodeRow | null, error: unknown }

      if (codeError || !codeData) {
        return res.status(404).json({
          success: false,
          message: 'Session code not found',
          hasCustomQuests: false,
        })
      }

      codeId = codeData.id
    }

    // Fetch quests assigned to this session
    const { data: sessionQuests, error: questError } = await supabase
      .from('session_quests')
      .select('quest_id, quest_order')
      .eq('session_code_id', codeId)
      .order('quest_order', { ascending: true }) as { data: SessionQuestRow[] | null, error: any }

    if (questError) {
      console.error('Error fetching session quests:', questError)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch session quests',
        hasCustomQuests: false,
      })
    }

    // If no quests assigned, session uses all quests (backward compatibility)
    if (!sessionQuests || sessionQuests.length === 0) {
      return res.status(200).json({
        success: true,
        quests: [],
        hasCustomQuests: false,
      })
    }

    // Map quest IDs to file paths
    const quests = sessionQuests.map((sq: SessionQuestRow) => ({
      questId: sq.quest_id,
      questOrder: sq.quest_order,
      filePath: `quests/${sq.quest_id}.json`,
    }))

    return res.status(200).json({
      success: true,
      quests,
      hasCustomQuests: true,
    })
  } catch (error) {
    console.error('Error in session quests API:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching session quests',
      hasCustomQuests: false,
    })
  }
}
