// API route for student login
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseApiClient, getSupabaseAdminClient } from '@/lib/supabase/server'
import type { SessionCode, StudentProfile } from '@/types/database'
import bcrypt from 'bcryptjs'

type LoginRequest = {
  username: string
  password: string
  sessionCode: string
}

type LoginResponse = {
  success: boolean
  message?: string
  student?: {
    id: string
    username: string
    displayName: string | null
    sessionCodeId: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    const { username, password, sessionCode }: LoginRequest = req.body

    // Validate input
    if (!username || !password || !sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and session code are required',
      })
    }

    // Use admin client for session code lookup (bypasses RLS since this is a public validation endpoint)
    const adminSupabase = getSupabaseAdminClient()

    // Check if session code is valid
    const { data: sessionCodeData, error: sessionCodeError } = await adminSupabase
      .from('session_codes')
      .select('id, code, validity_start, validity_end, is_active')
      .eq('code', sessionCode)
      .maybeSingle() as { data: Pick<SessionCode, 'id' | 'code' | 'validity_start' | 'validity_end' | 'is_active'> | null, error: any }

    // Create regular Supabase client for student operations
    const supabase = getSupabaseApiClient(req, res)

    if (sessionCodeError) {
      console.error('Error validating session code:', sessionCodeError)
      return res.status(500).json({
        success: false,
        message: 'An error occurred while validating session code',
      })
    }

    if (!sessionCodeData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session code',
      })
    }

    // Check if session code is currently valid
    const now = new Date()
    const validityStart = new Date(sessionCodeData.validity_start)
    const validityEnd = new Date(sessionCodeData.validity_end)

    if (!sessionCodeData.is_active) {
      return res.status(400).json({
        success: false,
        message: 'This session code has been deactivated',
      })
    }

    if (now < validityStart) {
      return res.status(400).json({
        success: false,
        message: 'This session code is not yet active',
      })
    }

    if (now > validityEnd) {
      return res.status(400).json({
        success: false,
        message: 'This session code has expired',
      })
    }

    // Check if student exists with this username and session code
    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('username', username)
      .eq('session_code_id', sessionCodeData.id)
      .maybeSingle() as { data: StudentProfile | null, error: any }

    if (studentError || !studentData) {
      // Student doesn't exist - create new student account
      const passwordHash = await bcrypt.hash(password, 10)

      const { data: newStudent, error: createError } = await supabase
        .from('student_profiles')
        .insert({
          username,
          password_hash: passwordHash,
          session_code_id: sessionCodeData.id,
          display_name: username,
          last_login: new Date().toISOString(),
        })
        .select()
        .maybeSingle() as { data: StudentProfile | null, error: any }

      if (createError || !newStudent) {
        console.error('Error creating student:', createError)
        return res.status(500).json({
          success: false,
          message: 'Failed to create student account',
        })
      }

      // Create initial game save for new student
      const { error: saveError } = await supabase
        .from('game_saves')
        .insert({
          student_profile_id: newStudent.id,
          game_state: {
            grids: [],
            entities: [],
            globalResources: { wheat: 0, energy: 100 },
            codeWindows: [],
            questProgress: {},
          },
          save_name: 'autosave',
        })

      if (saveError) {
        console.error('Error creating initial save:', saveError)
      }

      // Set session cookie
      res.setHeader('Set-Cookie', `student_session_id=${newStudent.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`)

      return res.status(200).json({
        success: true,
        message: 'Account created and logged in successfully',
        student: {
          id: newStudent.id,
          username: newStudent.username,
          displayName: newStudent.display_name,
          sessionCodeId: newStudent.session_code_id,
        },
      })
    }

    // Student exists - verify password
    const passwordMatch = await bcrypt.compare(password, studentData.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      })
    }

    // Update last login time
    await supabase
      .from('student_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', studentData.id)

    // Set session cookie
    res.setHeader('Set-Cookie', `student_session_id=${studentData.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      student: {
        id: studentData.id,
        username: studentData.username,
        displayName: studentData.display_name,
        sessionCodeId: studentData.session_code_id,
      },
    })
  } catch (error) {
    console.error('Student login error:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    })
  }
}
