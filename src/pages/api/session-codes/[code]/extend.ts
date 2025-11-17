// API route to extend session code validity (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminAuth'

type ExtendValidityRequest = {
  extensionHours?: number // Hours to extend
  extensionDays?: number // Days to extend
  newValidityEnd?: string // Or set a specific new end date
}

type ExtendValidityResponse = {
  success: boolean
  message?: string
  sessionCode?: {
    id: string
    code: string
    validityEnd: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExtendValidityResponse>
) {
  // Only allow PUT/PATCH requests
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
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
    const { code } = req.query
    const {
      extensionHours,
      extensionDays,
      newValidityEnd,
    }: ExtendValidityRequest = req.body

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Session code is required',
      })
    }

    const supabase = getSupabaseAdminClient()

    // Get the existing session code
    const { data: existingCode, error: fetchError } = await supabase
      .from('session_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (fetchError || !existingCode) {
      return res.status(404).json({
        success: false,
        message: 'Session code not found',
      })
    }

    // Check if admin owns this session code (unless super admin)
    if (admin.role !== 'super_admin' && existingCode.created_by_admin_id !== admin.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this session code',
      })
    }

    // Calculate new validity end date
    let newEndDate: Date

    if (newValidityEnd) {
      newEndDate = new Date(newValidityEnd)
    } else {
      // Extend from current validity end (or now if already expired)
      const currentEnd = new Date(existingCode.validity_end)
      const now = new Date()
      const baseDate = currentEnd > now ? currentEnd : now

      if (extensionDays) {
        newEndDate = new Date(baseDate)
        newEndDate.setDate(newEndDate.getDate() + extensionDays)
      } else if (extensionHours) {
        newEndDate = new Date(baseDate)
        newEndDate.setHours(newEndDate.getHours() + extensionHours)
      } else {
        // Default: extend by 30 days
        newEndDate = new Date(baseDate)
        newEndDate.setDate(newEndDate.getDate() + 30)
      }
    }

    // Update the session code
    const { data: updatedCode, error: updateError } = await supabase
      .from('session_codes')
      .update({
        validity_end: newEndDate.toISOString(),
        is_active: true, // Reactivate if it was deactivated
      })
      .eq('code', code)
      .select()
      .single()

    if (updateError || !updatedCode) {
      console.error('Error extending session code:', updateError)
      return res.status(500).json({
        success: false,
        message: 'Failed to extend session code validity',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Session code validity extended successfully',
      sessionCode: {
        id: updatedCode.id,
        code: updatedCode.code,
        validityEnd: updatedCode.validity_end,
      },
    })
  } catch (error) {
    console.error('Extend session code error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while extending session code validity',
    })
  }
}
