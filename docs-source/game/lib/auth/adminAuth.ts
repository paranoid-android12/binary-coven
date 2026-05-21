import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: 'super_admin' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedRequest extends NextApiRequest {
  adminUser?: AdminUser;
}

/**
 * Get admin user from session cookie
 * Returns null if no valid session or admin is inactive
 */
export async function getAdminFromRequest(req: NextApiRequest): Promise<AdminUser | null> {
  const adminSessionId = req.cookies.admin_session;

  if (!adminSessionId || adminSessionId === 'true') {
    // Old session format or no session
    return null;
  }

  try {
    // Use admin client to bypass RLS
    const supabase = getSupabaseAdminClient();

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', adminSessionId)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return null;
    }

    return admin as AdminUser;
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return null;
  }
}

/**
 * Middleware to require admin authentication
 * Returns 401 if not authenticated or admin is inactive
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminUser | null> {
  const admin = await getAdminFromRequest(req);

  if (!admin) {
    res.status(401).json({ error: 'Unauthorized. Admin authentication required.' });
    return null;
  }

  // Attach admin to request for use in handler
  (req as AuthenticatedRequest).adminUser = admin;

  return admin;
}

/**
 * Middleware to require super admin authentication
 * Returns 401 if not authenticated, 403 if not super admin
 */
export async function requireSuperAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminUser | null> {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    // Already sent 401 response
    return null;
  }

  if (admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden. Super admin privileges required.' });
    return null;
  }

  return admin;
}

/**
 * Verify admin session and return admin user
 * Used for session checking without blocking
 */
export async function verifyAdminSession(sessionId: string): Promise<AdminUser | null> {
  if (!sessionId || sessionId === 'true') {
    return null;
  }

  try {
    // Use admin client to bypass RLS
    const supabase = getSupabaseAdminClient();

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return null;
    }

    return admin as AdminUser;
  } catch (error) {
    console.error('Error verifying admin session:', error);
    return null;
  }
}

/**
 * Set admin session cookie
 */
export function setAdminSessionCookie(res: NextApiResponse, adminId: string): void {
  res.setHeader(
    'Set-Cookie',
    `admin_session=${adminId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
  );
}

/**
 * Clear admin session cookie
 */
export function clearAdminSessionCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
}
