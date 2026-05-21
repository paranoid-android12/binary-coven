// API route to validate a session code (public)
import type { NextApiRequest, NextApiResponse} from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import type { SessionCode } from '@/types/database'

type ValidateSessionResponse = {
  valid: boolean
  message?: string
  sessionCode?: {
    id: string
    code: string
    validityEnd: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateSessionResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      valid: false,
      message: 'Method not allowed',
    })
  }

  try {
    const { code } = req.query

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        valid: false,
        message: 'Session code is required',
      })
    }

    // Use admin client to bypass RLS (this is a public validation endpoint)
    const supabase = getSupabaseAdminClient()

    // Check if session code exists and is valid
    const { data: sessionCodeData, error } = await supabase
      .from('session_codes')
      .select('id, code, validity_start, validity_end, is_active')
      .eq('code', code)
      .maybeSingle() as { data: Pick<SessionCode, 'id' | 'code' | 'validity_start' | 'validity_end' | 'is_active'> | null, error: any }

    if (error || !sessionCodeData) {
      return res.status(200).json({
        valid: false,
        message: 'Invalid session code',
      })
    }

    const now = new Date()
    const validityStart = new Date(sessionCodeData.validity_start)
    const validityEnd = new Date(sessionCodeData.validity_end)

    if (!sessionCodeData.is_active) {
      return res.status(200).json({
        valid: false,
        message: 'This session code has been deactivated',
      })
    }

    if (now < validityStart) {
      return res.status(200).json({
        valid: false,
        message: 'This session code is not yet active',
      })
    }

    if (now > validityEnd) {
      return res.status(200).json({
        valid: false,
        message: 'This session code has expired',
      })
    }

    return res.status(200).json({
      valid: true,
      message: 'Session code is valid',
      sessionCode: {
        id: sessionCodeData.id,
        code: sessionCodeData.code,
        validityEnd: sessionCodeData.validity_end,
      },
    })
  } catch (error) {
    console.error('Validate session code error:', error)
    return res.status(500).json({
      valid: false,
      message: 'An error occurred while validating session code',
    })
  }
}
