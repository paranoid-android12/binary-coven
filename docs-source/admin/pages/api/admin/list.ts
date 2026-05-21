// API route to list all admin users (super admin only)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/adminAuth';

type AdminListItem = {
  id: string;
  username: string;
  email: string | null;
  role: 'super_admin' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  session_count?: number;
};

type ListAdminsResponse = {
  success: boolean;
  message?: string;
  admins?: AdminListItem[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListAdminsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  // Verify super admin authentication
  const superAdmin = await requireSuperAdmin(req, res);
  if (!superAdmin) {
    // Response already sent by requireSuperAdmin
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Get all admin users with session counts
    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select(`
        id,
        username,
        email,
        role,
        is_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (adminsError) {
      console.error('Error fetching admin users:', adminsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch admin users',
      });
    }

    // Get session counts for each admin
    const adminsWithCounts = await Promise.all(
      (admins || []).map(async (admin) => {
        const { count } = await supabase
          .from('session_codes')
          .select('*', { count: 'exact', head: true })
          .eq('created_by_admin_id', admin.id);

        return {
          ...admin,
          session_count: count || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      admins: adminsWithCounts,
    });
  } catch (error) {
    console.error('List admins error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching admin users',
    });
  }
}
