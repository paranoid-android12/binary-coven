// API route to deactivate session code (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminAuth'

type DeactivateResponse = {
  success: boolean
  message?: string
  sessionCode?: {
    id: string
    code: string
    isActive: boolean
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeactivateResponse>
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

    // Check if already deactivated
    if (!existingCode.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Session code is already deactivated',
      })
    }

    // Deactivate the session code
    const { data: updatedCode, error: updateError } = await supabase
      .from('session_codes')
      .update({
        is_active: false,
      })
      .eq('code', code)
      .select()
      .single()

    if (updateError || !updatedCode) {
      console.error('Error deactivating session code:', updateError)
      return res.status(500).json({
        success: false,
        message: 'Failed to deactivate session code',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Session code deactivated successfully',
      sessionCode: {
        id: updatedCode.id,
        code: updatedCode.code,
        isActive: updatedCode.is_active,
      },
    })
  } catch (error) {
    console.error('Deactivate session code error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deactivating session code',
    })
  }
}
