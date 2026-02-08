import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface SessionInfo {
  id: string;
  code: string;
  isActive: boolean;
  validityStart: string | null;
  validityEnd: string | null;
  maxStudents: number | null;
  createdAt: string;
}

interface SessionsResponse {
  success: boolean;
  message?: string;
  sessions: SessionInfo[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionsResponse>,
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      sessions: [],
    });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured',
        sessions: [],
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('session_codes')
      .select('id, code, is_active, validity_start, validity_end, max_students, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[sessions] DB error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database query failed',
        sessions: [],
      });
    }

    const sessions: SessionInfo[] = (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      isActive: row.is_active ?? true,
      validityStart: row.validity_start || null,
      validityEnd: row.validity_end || null,
      maxStudents: row.max_students || null,
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('[sessions] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      sessions: [],
    });
  }
}
