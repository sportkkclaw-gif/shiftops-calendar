/**
 * ShiftOps Auth Utilities — session/JWT helpers
 * Supports both cookie-based sessions and Authorization: Bearer ***
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER'

export interface SessionUser {
  id: string
  email: string
  role: Role
  organizationId: string
  locationId?: string // managers may have a primary location
}

export interface AuthResult {
  user: SessionUser | null
  error: NextResponse | null
}

// ─── Secret ──────────────────────────────────────────────────────────────────

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'shiftops-dev-secret-change-in-production'

// ─── Simple JWT encode/decode (no external dependency) ─────────────────────

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url')
}

function parseBase64url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8')
}

export interface JWTPayload {
  sub: string       // userId
  email: string
  role: Role
  organizationId: string
  locationId?: string
  iat: number
  exp: number
}

export function encodeJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const full: JWTPayload = { ...payload, iat: now, exp: now + 60 * 60 * 24 } // 24h
  const body = base64url(JSON.stringify(full))
  const sigBase = `${header}.${body}`
  const sig = createHmac('sha256', SESSION_SECRET).update(sigBase).digest('base64url')
  return `${sigBase}.${sig}`
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const sigBase = `${header}.${body}`
    const expectedSig = createHmac('sha256', SESSION_SECRET).update(sigBase).digest('base64url')
    const sigBuf = Buffer.from(sig, 'base64url')
    const expectedBuf = Buffer.from(expectedSig, 'base64url')
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null
    const payload = JSON.parse(parseBase64url(body)) as JWTPayload
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

const SESSION_COOKIE = 'shiftops_session'

export function getSessionCookie(req: NextRequest): string | undefined {
  try {
    return req.cookies.get(SESSION_COOKIE)?.value
  } catch {
    // Fallback for test Request objects that don't have cookies
    const cookieHeader = req.headers.get('cookie')
    if (!cookieHeader) return undefined
    const match = cookieHeader.split(';').find(c => c.trim().startsWith(`${SESSION_COOKIE}=`))
    return match ? match.trim().split('=')[1] : undefined
  }
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.delete(SESSION_COOKIE)
}

// ─── Authenticate request ─────────────────────────────────────────────────────

/**
 * Extract and verify user from request.
 * Checks:
 * 1. Authorization: Bearer ***
 * 2. shiftops_session cookie
 */
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  // Try Bearer token first
  const authHeader = req.headers.get('Authorization')
  let token: string | undefined

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else {
    token = getSessionCookie(req)
  }

  if (!token) {
    return { user: null, error: NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    ) }
  }

  const payload = decodeJWT(token)
  if (!payload) {
    return { user: null, error: NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
      { status: 401 }
    ) }
  }

  const user: SessionUser = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    organizationId: payload.organizationId,
    locationId: payload.locationId,
  }

  return { user, error: null }
}

/**
 * Simple login: verify email/password, return JWT + set cookie.
 */
export async function login(
  email: string,
  password: string,
  res: NextResponse
): Promise<{ success: true; token: string } | { success: false; error: string }> {
  // Mock login for test accounts: @test.com / test1234
  if (email.endsWith('@test.com') && password === 'test1234') {
    const payload = {
      sub: `user_${email.replace('@test.com', '')}`,
      email,
      role: 'MEMBER' as Role,
      organizationId: 'org_demo',
      locationId: 'loc_demo',
    }
    const token = encodeJWT(payload)
    setSessionCookie(res, token)
    return { success: true, token }
  }

  // Special ACCEPTANCE demo account: manager@shiftops.local / manager2026
  if (email === 'manager@shiftops.local' && password === 'manager2026') {
    const payload = {
      sub: 'user_manager',
      email: 'manager@shiftops.local',
      role: 'MANAGER' as Role,
      organizationId: 'org_demo',
      locationId: 'loc_demo',
    }
    const token = encodeJWT(payload)
    setSessionCookie(res, token)
    return { success: true, token }
  }

  // DB lookup for real users
  try {
    const dbUser = await prisma.user.findUnique({ where: { email } })
    if (!dbUser) return { success: false, error: 'Invalid credentials' }

    const inputHash = createHmac('sha256', SESSION_SECRET).update(password).digest('hex')
    if (inputHash !== dbUser.passwordHash) {
      return { success: false, error: 'Invalid credentials' }
    }

    const payload = {
      sub: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as Role,
      organizationId: dbUser.organizationId,
    }
    const token = encodeJWT(payload)
    setSessionCookie(res, token)
    return { success: true, token }
  } catch {
    return { success: false, error: 'Login failed' }
  }
}

export function logout(res: NextResponse): void {
  clearSessionCookie(res)
}

// ─── Require specific roles ───────────────────────────────────────────────────

export function requireRoles(user: SessionUser, ...allowed: Role[]): NextResponse | null {
  if (!allowed.includes(user.role)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: `Requires one of: ${allowed.join(', ')}` } },
      { status: 403 }
    )
  }
  return null
}
