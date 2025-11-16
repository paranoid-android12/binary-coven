// API route to list all session codes (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminAuth'

type SessionCodeItem = {
  id: string
  code: string
  validityStart: string
  validityEnd: string
  isActive: boolean
  createdAt: string
  studentCount: number
  activeStudents24h: number
  status: 'active' | 'expired' | 'scheduled'
}

type ListSessionCodesResponse = {
  success: boolean
  message?: string
  sessionCodes?: SessionCodeItem[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListSessionCodesResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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
    const supabase = getSupabaseAdminClient()

    // Build query - super admins see all sessions, regular admins see only their own
    let query = supabase
      .from('session_code_stats')
      .select('*');

    // Filter by admin for non-super admins
    if (admin.role !== 'super_admin') {
      query = query.eq('created_by_admin_id', admin.id);
    }

    const { data: sessionCodes, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching session codes:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch session codes',
      })
    }

    const formattedCodes: SessionCodeItem[] = sessionCodes.map((code) => ({
      id: code.id,
      code: code.code,
      validityStart: code.validity_start,
      validityEnd: code.validity_end,
      isActive: code.is_active,
      createdAt: code.created_at,
      studentCount: code.student_count || 0,
      activeStudents24h: code.active_students_24h || 0,
      status: code.status as 'active' | 'expired' | 'scheduled',
    }))

    return res.status(200).json({
      success: true,
      sessionCodes: formattedCodes,
    })
  } catch (error) {
    console.error('List session codes error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching session codes',
    })
  }
}
