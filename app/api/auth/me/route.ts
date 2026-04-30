/**
 * GET /api/auth/me
 * Returns the current authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (auth.error) return auth.error

  return NextResponse.json({
    data: auth.user,
    meta: { requestId: `req_${Date.now()}` },
  })
}
