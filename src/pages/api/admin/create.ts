// API route to create a new admin user (super admin only)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/adminAuth';
import bcrypt from 'bcryptjs';

type CreateAdminRequest = {
  username: string;
  password: string;
  email?: string;
  role: 'super_admin' | 'admin';
};

type CreateAdminResponse = {
  success: boolean;
  message?: string;
  admin?: {
    id: string;
    username: string;
    email: string | null;
    role: 'super_admin' | 'admin';
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateAdminResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
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
    const { username, password, email, role }: CreateAdminRequest = req.body;

    // Validate input
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and role are required',
      });
    }

    // Validate username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores',
      });
    }

    // Validate password strength (min 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Validate role
    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "super_admin" or "admin"',
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    const supabase = getSupabaseAdminClient();

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const { data: existingEmail } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
        });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const { data: newAdmin, error: createError } = await supabase
      .from('admin_users')
      .insert({
        username,
        password_hash: passwordHash,
        email: email || null,
        role,
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newAdmin) {
      console.error('Error creating admin user:', createError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create admin user',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating admin user',
    });
  }
}
