// API route for admin login
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

type AdminLoginRequest = {
  password: string
}

type AdminLoginResponse = {
  success: boolean
  message?: string
  admin?: {
    id: string
    role: 'admin'
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
    const { password }: AdminLoginRequest = req.body

    // Validate input
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      })
    }

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdminClient()

    // Get admin settings
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .single()

    if (adminError || !adminSettings) {
      console.error('Error fetching admin settings:', adminError)
      return res.status(500).json({
        success: false,
        message: 'Failed to verify admin credentials',
      })
    }

    // Check if we need to initialize admin password
    if (adminSettings.password_hash === '$2a$10$placeholder') {
      // First-time setup - use ADMIN_PASSWORD from env
      const envAdminPassword = process.env.ADMIN_PASSWORD

      if (!envAdminPassword) {
        return res.status(500).json({
          success: false,
          message: 'Admin password not configured. Please set ADMIN_PASSWORD in .env.local',
        })
      }

      // Hash the password and update
      const newHash = await bcrypt.hash(envAdminPassword, 10)
      const { error: updateError } = await supabase
        .from('admin_settings')
        .update({ password_hash: newHash })
        .eq('id', adminSettings.id)

      if (updateError) {
        console.error('Error updating admin password:', updateError)
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize admin password',
        })
      }

      // Check against env password for first login
      if (password !== envAdminPassword) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password',
        })
      }

      // Set admin session (using simple approach - you can enhance with JWT)
      res.setHeader('Set-Cookie', `admin_session=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`)

      return res.status(200).json({
        success: true,
        message: 'Admin login successful (password initialized)',
        admin: {
          id: adminSettings.id,
          role: 'admin',
        },
      })
    }

    // Verify password against stored hash
    const passwordMatch = await bcrypt.compare(password, adminSettings.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      })
    }

    // Set admin session cookie
    res.setHeader('Set-Cookie', `admin_session=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`)

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: adminSettings.id,
        role: 'admin',
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
