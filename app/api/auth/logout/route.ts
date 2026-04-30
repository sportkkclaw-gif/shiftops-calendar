/**
 * POST /api/auth/logout
 * Clears session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/lib/auth'

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ data: { success: true } })
  logout(res)
  return res
}
