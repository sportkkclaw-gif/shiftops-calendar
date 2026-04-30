/**
 * POST /api/auth/login
 * Returns JWT in body + sets session cookie.
 * Body: { email: string, password: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { login } from '@/lib/auth'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    // Build response object upfront so login() can set cookie directly on it.
    // We use a Response-like object that res.cookies.set() can mutate.
    const res = new NextResponse('{}', { status: 200 })
    const result = await login(email, password, res)

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: result.error } },
        { status: 401 }
      )
    }

    // Now set the JSON body on the same response object that already has the cookie
    res.headers.set('Content-Type', 'application/json')
    const finalBody = JSON.stringify({
      data: { token: result.token, email },
      meta: { requestId: `req_${Date.now()}` },
    })
    return new Response(finalBody, {
      status: 200,
      headers: res.headers,
    })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
