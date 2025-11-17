// API route for admin login
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
// import bcrypt from 'bcryptjs'
import { setAdminSessionCookie } from '@/lib/auth/adminAuth'

type AdminLoginRequest = {
  username: string
  password: string
}

type AdminLoginResponse = {
  success: boolean
  message?: string
  admin?: {
    id: string
    username: string
    email: string | null
    role: 'super_admin' | 'admin'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminLoginResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    const { username, password }: AdminLoginRequest = req.body

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      })
    }

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdminClient()

    // Get admin user by username
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single()

    if (adminError || !adminUser) {
      // Don't reveal whether username exists
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      })
    }

    // Check if admin is active
    if (!adminUser.is_active) {
      return res.status(401).json({
        success: false,
        message: 'This admin account has been archived',
      })
    }

    // Verify password (unhashed comparison for now)
    const passwordMatch = password === adminUser.password_hash

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      })
    }

    // Set admin session cookie with admin user ID
    setAdminSessionCookie(res, adminUser.id)

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred during admin login',
    })
  }
}
