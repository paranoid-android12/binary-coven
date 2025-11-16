// API route to archive/unarchive an admin user (super admin only)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/adminAuth';

type ArchiveAdminRequest = {
  is_active: boolean;
};

type ArchiveAdminResponse = {
  success: boolean;
  message?: string;
  admin?: {
    id: string;
    username: string;
    is_active: boolean;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ArchiveAdminResponse>
) {
  // Only allow PUT requests
  if (req.method !== 'PUT') {
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
    const { id } = req.query;
    const { is_active }: ArchiveAdminRequest = req.body;

    // Validate input
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value',
      });
    }

    // Validate ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID',
      });
    }

    // Prevent super admin from archiving themselves
    if (id === superAdmin.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot archive your own account',
      });
    }

    const supabase = getSupabaseAdminClient();

    // Check if admin exists
    const { data: targetAdmin, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, username, role')
      .eq('id', id)
      .single();

    if (fetchError || !targetAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    // Update admin status
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('admin_users')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedAdmin) {
      console.error('Error updating admin status:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update admin status',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Admin user ${is_active ? 'activated' : 'archived'} successfully`,
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        is_active: updatedAdmin.is_active,
      },
    });
  } catch (error) {
    console.error('Archive admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating admin status',
    });
  }
}
