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

    return res.status(200).json({
      success: true,
      message: 'Session code created successfully',
      sessionCode: {
        id: newSessionCode.id,
        code: newSessionCode.code,
        validityStart: newSessionCode.validity_start,
        validityEnd: newSessionCode.validity_end,
        isActive: newSessionCode.is_active,
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
