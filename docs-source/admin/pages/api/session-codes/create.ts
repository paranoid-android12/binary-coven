// API route to create a new session code (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminAuth'

type CreateSessionRequest = {
  code?: string // Optional - will generate if not provided
  validityHours?: number // Hours from now
  validityDays?: number // Days from now
  validityEnd?: string // Specific end date ISO string
  maxStudents?: number // Max students allowed (null = unlimited)
  selectedQuests?: string[] // Optional - quest IDs to include in session (empty = all quests)
  enforcePrerequisites?: boolean // Whether to enforce quest prerequisites (default: false)
}

type CreateSessionResponse = {
  success: boolean
  message?: string
  sessionCode?: {
    id: string
    code: string
    validityStart: string
    validityEnd: string
    isActive: boolean
    questCount: number
  }
}

// Generate a random session code
function generateSessionCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar characters
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateSessionResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  // Check admin authentication
  const admin = await requireAdmin(req, res);
  if (!admin) {
    // Response already sent by requireAdmin
    return;
  }

  try {
    const {
      code,
      validityHours,
      validityDays,
      validityEnd,
      maxStudents,
      selectedQuests,
      enforcePrerequisites,
    }: CreateSessionRequest = req.body

    // Generate or use provided code
    const sessionCode = code || generateSessionCode()

    // Calculate validity end date
    let endDate: Date

    if (validityEnd) {
      endDate = new Date(validityEnd)
    } else if (validityDays) {
      endDate = new Date()
      endDate.setDate(endDate.getDate() + validityDays)
    } else if (validityHours) {
      endDate = new Date()
      endDate.setHours(endDate.getHours() + validityHours)
    } else {
      // Default: 30 days
      endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)
    }

    // Use admin client to create session code
    const supabase = getSupabaseAdminClient()

    // Check if code already exists
    const { data: existingCode } = await supabase
      .from('session_codes')
      .select('code')
      .eq('code', sessionCode)
      .single()

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Session code "${sessionCode}" already exists. Please choose a different code.`,
      })
    }

    // Insert new session code
    const { data: newSessionCode, error: createError } = await supabase
      .from('session_codes')
      .insert({
        code: sessionCode,
        validity_end: endDate.toISOString(),
        max_students: maxStudents || null,
        created_by_admin_id: admin.id,
        enforce_prerequisites: enforcePrerequisites ?? false,
      })
      .select()
      .single()

    if (createError || !newSessionCode) {
      console.error('Error creating session code:', createError)
      return res.status(500).json({
        success: false,
        message: 'Failed to create session code',
      })
    }

    // If selected quests are provided, insert them into session_quests table
    let questCount = 0
    let questsAssigned = false
    
    if (selectedQuests && Array.isArray(selectedQuests) && selectedQuests.length > 0) {
      // Validate quest IDs - must be non-empty strings, max 100 chars each, max 50 quests
      const validQuests = selectedQuests
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0 && id.length <= 100)
        .slice(0, 50); // Limit to 50 quests max
      
      if (validQuests.length > 0) {
        const questInserts = validQuests.map((questId, index) => ({
          session_code_id: newSessionCode.id,
          quest_id: questId.trim(),
          quest_order: index + 1,
        }))

        const { error: questError } = await supabase
          .from('session_quests')
          .insert(questInserts)

        if (questError) {
          console.error('Error inserting session quests:', questError)
          // Don't fail the whole request, but log the error
          // The session code was created, quests just weren't assigned
        } else {
          questCount = validQuests.length
          questsAssigned = true
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: questsAssigned 
        ? `Session code created with ${questCount} quest(s) assigned`
        : 'Session code created with all quests available',
      sessionCode: {
        id: newSessionCode.id,
        code: newSessionCode.code,
        validityStart: newSessionCode.validity_start,
        validityEnd: newSessionCode.validity_end,
        isActive: newSessionCode.is_active,
        questCount,
      },
    })
  } catch (error) {
    console.error('Create session code error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating session code',
    })
  }
}
