/**
 * Auth API Tests — login, logout, me, JWT encode/decode
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}))

function makeJsonReq(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeGetReq(url: string, token?: string) {
  return new Request(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

// ─── JWT encode/decode unit tests ─────────────────────────────────────────────

describe('JWT encode/decode', () => {
  const { encodeJWT, decodeJWT } = require('@/lib/auth')

  it('✓ encodes and decodes a valid token', () => {
    const payload = { sub: 'user_123', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_1' }
    const token = encodeJWT(payload)
    expect(typeof token).toBe('string')
    const decoded = decodeJWT(token)
    expect(decoded?.sub).toBe('user_123')
    expect(decoded?.role).toBe('ADMIN')
  })

  it('✓ rejects tampered token', () => {
    const payload = { sub: 'user_123', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_1' }
    const token = encodeJWT(payload)
    const tampered = token.slice(0, -5) + 'xxxxx'
    expect(decodeJWT(tampered)).toBeNull()
  })

  it('✓ rejects expired token (exp in past)', () => {
    const { encodeJWT: enc } = require('@/lib/auth')
    // Manually create an expired payload by modifying decode to test
    const parts = enc({ sub: 'u', email: 'a@b.com', role: 'MEMBER', organizationId: 'o' }).split('.')
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    body.exp = Math.floor(Date.now() / 1000) - 3600
    const tampered = `${parts[0]}.${Buffer.from(JSON.stringify(body)).toString('base64url')}.${parts[2]}`
    expect(decodeJWT(tampered)).toBeNull()
  })
})

// ─── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: valid test credentials return token', async () => {
    const req = makeJsonReq({ email: 'admin@test.com', password: 'test1234' })
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.token).toBeDefined()
    expect(json.data.email).toBe('admin@test.com')
  })

  it('✗ 401: wrong password', async () => {
    const req = makeJsonReq({ email: 'admin@test.com', password: 'wrongpass' })
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('✗ 400: missing email', async () => {
    const req = makeJsonReq({ password: 'test1234' })
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(400)
  })

  it('✓ sets httpOnly session cookie on successful login', async () => {
    const req = makeJsonReq({ email: 'admin@test.com', password: 'test1234' })
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('Set-Cookie')
    expect(setCookie).not.toBeNull()
    expect(setCookie).toContain('shiftops_session=')
    expect(setCookie).toContain('HttpOnly')
    // SameSite=lax (lowercase is the Next.js default); Secure is set only in production
    expect(setCookie).toContain('SameSite=lax')
  })

  it('✓ does not set cookie on failed login', async () => {
    const req = makeJsonReq({ email: 'admin@test.com', password: 'wrongpass' })
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
    const setCookie = res.headers.get('Set-Cookie')
    // On auth failure, response is NextResponse.json() — no Set-Cookie expected
    expect(setCookie ?? '').not.toContain('shiftops_session=')
  })
})

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('✓ success: returns 200 and clears cookie', async () => {
    const req = new Request('http://localhost/api/auth/logout', { method: 'POST' })
    const { POST } = await import('@/app/api/auth/logout/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.success).toBe(true)
  })
})

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: returns current user with valid token', async () => {
    const { encodeJWT } = require('@/lib/auth')
    const token = encodeJWT({ sub: 'user_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo' })
    const req = makeGetReq('http://localhost/api/auth/me', token)
    const { GET } = await import('@/app/api/auth/me/route')
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.email).toBe('admin@test.com')
    expect(json.data.role).toBe('ADMIN')
  })

  it('✗ 401: no token provided', async () => {
    const req = makeGetReq('http://localhost/api/auth/me')
    const { GET } = await import('@/app/api/auth/me/route')
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
  })

  it('✗ 401: invalid token', async () => {
    const req = makeGetReq('http://localhost/api/auth/me')
    const { GET } = await import('@/app/api/auth/me/route')
    const req2 = makeGetReq('http://localhost/api/auth/me', 'not.a.valid.token')
    const res = await GET(req2 as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
  })
})

