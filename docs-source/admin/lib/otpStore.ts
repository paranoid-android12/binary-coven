// OTP store backed by Supabase database
// Stores OTP codes in the otp_codes table for persistence across restarts/reloads

import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { randomInt } from 'crypto'

const OTP_EXPIRY_MS = 5 * 60 * 1000   // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000   // 1 minute
const MAX_OTP_ATTEMPTS = 5             // Lock out after 5 wrong attempts

/**
 * Generate a 6-digit OTP code using a cryptographically secure RNG
 */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString()
}

/**
 * Store an OTP for a given email (in the database)
 * Returns { success, message, cooldownRemaining? }
 */
export async function storeOtp(email: string, code: string): Promise<{
  success: boolean
  message: string
  cooldownRemaining?: number
}> {
  const key = email.toLowerCase().trim()
  const now = new Date()
  const adminSupabase = getSupabaseAdminClient()

  // Check resend cooldown — find the most recent unused OTP for this email
  const { data: existing } = await (adminSupabase
    .from('otp_codes') as any)
    .select('created_at')
    .eq('email', key)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const createdAt = new Date(existing.created_at)
    const elapsed = now.getTime() - createdAt.getTime()
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
      return {
        success: false,
        message: `Please wait ${remaining} seconds before requesting a new code`,
        cooldownRemaining: remaining,
      }
    }
  }

  // Mark any previous codes for this email as used
  await (adminSupabase
    .from('otp_codes') as any)
    .update({ used: true })
    .eq('email', key)
    .eq('used', false)

  // Insert new OTP
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS)
  const { error } = await (adminSupabase
    .from('otp_codes') as any)
    .insert({
      email: key,
      code,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('Failed to store OTP:', error)
    return { success: false, message: 'Failed to generate verification code' }
  }

  return { success: true, message: 'OTP stored successfully' }
}

/**
 * Verify an OTP for a given email
 * Returns { valid, message }
 */
export async function verifyOtp(email: string, code: string): Promise<{
  valid: boolean
  message: string
}> {
  const result = await checkOtp(email, code)
  if (!result.valid) return result

  // OTP is valid — mark as used so it can't be reused
  const adminSupabase = getSupabaseAdminClient()
  await (adminSupabase
    .from('otp_codes') as any)
    .update({ used: true })
    .eq('id', result._entryId)

  return { valid: true, message: 'OTP verified successfully' }
}

/**
 * Check an OTP for a given email WITHOUT consuming it.
 * Use this to validate the code before proceeding to the next step.
 * Returns { valid, message, _entryId? }
 */
export async function checkOtp(email: string, code: string): Promise<{
  valid: boolean
  message: string
  _entryId?: string
}> {
  const key = email.toLowerCase().trim()
  const now = new Date()
  const adminSupabase = getSupabaseAdminClient()

  // Find matching unused OTP for this email
  const { data: entry, error } = await (adminSupabase
    .from('otp_codes') as any)
    .select('id, code, expires_at, attempts')
    .eq('email', key)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !entry) {
    return { valid: false, message: 'No OTP found. Please request a new code.' }
  }

  if (new Date(entry.expires_at) < now) {
    // Mark as used (expired)
    await (adminSupabase
      .from('otp_codes') as any)
      .update({ used: true })
      .eq('id', entry.id)
    return { valid: false, message: 'OTP has expired. Please request a new code.' }
  }

  if (entry.code !== code) {
    // Increment attempt counter
    const currentAttempts = (entry.attempts ?? 0) + 1
    await (adminSupabase
      .from('otp_codes') as any)
      .update({ attempts: currentAttempts })
      .eq('id', entry.id)

    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      // Lock out — mark OTP as used so it can't be tried again
      await (adminSupabase
        .from('otp_codes') as any)
        .update({ used: true })
        .eq('id', entry.id)
      return { valid: false, message: 'Too many incorrect attempts. Please request a new code.' }
    }

    return { valid: false, message: `Invalid code. ${MAX_OTP_ATTEMPTS - currentAttempts} attempts remaining.` }
  }

  return { valid: true, message: 'OTP verified successfully', _entryId: entry.id }
}

/**
 * Check how many seconds remain in the resend cooldown for an email
 * Returns 0 if no cooldown is active
 */
export async function getResendCooldown(email: string): Promise<number> {
  const key = email.toLowerCase().trim()
  const now = new Date()
  const adminSupabase = getSupabaseAdminClient()

  const { data: entry } = await (adminSupabase
    .from('otp_codes') as any)
    .select('created_at')
    .eq('email', key)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!entry) return 0

  const createdAt = new Date(entry.created_at)
  const elapsed = now.getTime() - createdAt.getTime()
  if (elapsed >= RESEND_COOLDOWN_MS) return 0

  return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
}
