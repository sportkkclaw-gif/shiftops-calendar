/**
 * ShiftType CRUD API Tests
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    shiftType: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const mockPrisma = jest.requireMock('@/lib/prisma').prisma

function makeJsonReq(body: unknown, token?: string) {
  return new Request('http://localhost/api/shift-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
}

function makeGetReq(url: string, token?: string) {
  return new Request(url, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
}

function makePatchReq(url: string, body: unknown, token?: string) {
  return new Request(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
}

function makeDeleteReq(url: string, token?: string) {
  return new Request(url, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
}

function adminToken() {
  const { encodeJWT } = require('@/lib/auth')
  return encodeJWT({ sub: 'admin_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo', locationId: 'loc_demo' })
}

function managerToken() {
  const { encodeJWT } = require('@/lib/auth')
  return encodeJWT({ sub: 'manager_1', email: 'manager@test.com', role: 'MANAGER', organizationId: 'org_demo', locationId: 'loc_demo' })
}

function memberToken() {
  const { encodeJWT } = require('@/lib/auth')
  return encodeJWT({ sub: 'member_1', email: 'member@test.com', role: 'MEMBER', organizationId: 'org_demo', locationId: 'loc_demo' })
}

const STUB_SHIFT = {
  id: 'st_1', name: '早班', code: 'A', color: '#FF0000',
  organizationId: 'org_demo', locationId: 'loc_demo',
  startTime: '08:00', endTime: '16:00', durationMinutes: 480,
  isAllDay: false, isOnCall: false, supportsSegments: false,
  createdAt: new Date(), updatedAt: new Date(),
}

// ─── POST /api/shift-types ─────────────────────────────────────────────────────

describe('POST /api/shift-types', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: ADMIN can create shift type', async () => {
    mockPrisma.shiftType.create.mockResolvedValue(STUB_SHIFT)
    const req = makeJsonReq({ name: '早班', code: 'A', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo' }, adminToken())
    const { POST } = await import('@/app/api/shift-types/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.code).toBe('A')
  })

  it('✓ success: MANAGER can create shift type in own location', async () => {
    mockPrisma.shiftType.create.mockResolvedValue(STUB_SHIFT)
    const req = makeJsonReq({ name: '早班', code: 'A', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo' }, managerToken())
    const { POST } = await import('@/app/api/shift-types/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(201)
  })

  it('✗ 403: MANAGER cannot create shift type in another location', async () => {
    const req = makeJsonReq({ name: '午班', code: 'B', color: '#00FF00', organizationId: 'org_demo', locationId: 'loc_other' }, managerToken())
    const { POST } = await import('@/app/api/shift-types/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(403)
  })

  it('✗ 403: MEMBER cannot create shift type', async () => {
    const req = makeJsonReq({ name: '早班', code: 'A', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo' }, memberToken())
    const { POST } = await import('@/app/api/shift-types/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(403)
  })

  it('✗ 401: unauthenticated request', async () => {
    const req = makeJsonReq({ name: '早班', code: 'A', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo' })
    const { POST } = await import('@/app/api/shift-types/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
  })

  it('✗ 400: invalid hex color', async () => {
    const req = makeJsonReq({ name: '早班', code: 'A', color: 'not-a-color', organizationId: 'org_demo', locationId: 'loc_demo' }, adminToken())
    const { POST } = await import('@/app/api/shift-types/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(400)
  })

  it('✗ 400: missing required fields', async () => {
    const req = makeJsonReq({ name: '早班' }, adminToken())
    const { POST } = await import('@/app/api/shift-types/route')
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })
})

// ─── GET /api/shift-types ─────────────────────────────────────────────────────

describe('GET /api/shift-types', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: ADMIN can list shift types', async () => {
    mockPrisma.shiftType.findMany.mockResolvedValue([STUB_SHIFT])
    mockPrisma.shiftType.count.mockResolvedValue(1)
    const req = makeGetReq('http://localhost/api/shift-types?organizationId=org_demo', adminToken())
    const { GET } = await import('@/app/api/shift-types/route')
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.meta.total).toBe(1)
  })

  it('✗ 401: unauthenticated', async () => {
    const req = makeGetReq('http://localhost/api/shift-types?organizationId=org_demo')
    const { GET } = await import('@/app/api/shift-types/route')
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
  })

  it('✗ 400: missing organizationId', async () => {
    const req = makeGetReq('http://localhost/api/shift-types', adminToken())
    const { GET } = await import('@/app/api/shift-types/route')
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/shift-types/[id] ────────────────────────────────────────────────

describe('GET /api/shift-types/[id]', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: ADMIN can get any shift type', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue(STUB_SHIFT)
    const req = makeGetReq('http://localhost/api/shift-types/st_1', adminToken())
    const { GET } = await import('@/app/api/shift-types/[id]/route')
    const res = await GET(req as unknown as import('next').NextRequest, { params: { id: 'st_1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe('st_1')
  })

  it('✗ 404: shift type not found', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue(null)
    const req = makeGetReq('http://localhost/api/shift-types/not_exist', adminToken())
    const { GET } = await import('@/app/api/shift-types/[id]/route')
    const res = await GET(req as unknown as import('next').NextRequest, { params: { id: 'not_exist' } } as unknown as Record<string, string>)
    expect(res.status).toBe(404)
  })

  it('✗ 403: MANAGER cannot get shift type in another location', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue({ ...STUB_SHIFT, locationId: 'loc_other' })
    const req = makeGetReq('http://localhost/api/shift-types/st_other', managerToken())
    const { GET } = await import('@/app/api/shift-types/[id]/route')
    const res = await GET(req as unknown as import('next').NextRequest, { params: { id: 'st_other' } } as unknown as Record<string, string>)
    expect(res.status).toBe(403)
  })
})

// ─── PATCH /api/shift-types/[id] ─────────────────────────────────────────────

describe('PATCH /api/shift-types/[id]', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: ADMIN can update shift type', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue(STUB_SHIFT)
    mockPrisma.shiftType.update.mockResolvedValue({ ...STUB_SHIFT, name: '午班' })
    const req = makePatchReq('http://localhost/api/shift-types/st_1', { name: '午班' }, adminToken())
    const { PATCH } = await import('@/app/api/shift-types/[id]/route')
    const res = await PATCH(req as unknown as import('next').NextRequest, { params: { id: 'st_1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe('午班')
  })

  it('✗ 403: MANAGER cannot update shift type in another location', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue({ ...STUB_SHIFT, locationId: 'loc_other' })
    const req = makePatchReq('http://localhost/api/shift-types/st_other', { name: 'new name' }, managerToken())
    const { PATCH } = await import('@/app/api/shift-types/[id]/route')
    const res = await PATCH(req as unknown as import('next').NextRequest, { params: { id: 'st_other' } } as unknown as Record<string, string>)
    expect(res.status).toBe(403)
  })

  it('✗ 400: invalid color format', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue(STUB_SHIFT)
    const req = makePatchReq('http://localhost/api/shift-types/st_1', { color: 'red' }, adminToken())
    const { PATCH } = await import('@/app/api/shift-types/[id]/route')
    const res = await PATCH(req as unknown as import('next').NextRequest, { params: { id: 'st_1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/shift-types/[id] ───────────────────────────────────────────

describe('DELETE /api/shift-types/[id]', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: ADMIN can delete shift type', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue(STUB_SHIFT)
    mockPrisma.shiftType.delete.mockResolvedValue({ id: 'st_1' })
    const req = makeDeleteReq('http://localhost/api/shift-types/st_1', adminToken())
    const { DELETE } = await import('@/app/api/shift-types/[id]/route')
    const res = await DELETE(req as unknown as import('next').NextRequest, { params: { id: 'st_1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.deleted).toBe(true)
  })

  it('✗ 403: MANAGER cannot delete shift type (ADMIN only)', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue(STUB_SHIFT)
    const req = makeDeleteReq('http://localhost/api/shift-types/st_1', managerToken())
    const { DELETE } = await import('@/app/api/shift-types/[id]/route')
    const res = await DELETE(req as unknown as import('next').NextRequest, { params: { id: 'st_1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(403)
  })

  it('✗ 404: shift type not found', async () => {
    mockPrisma.shiftType.findUnique.mockResolvedValue(null)
    const req = makeDeleteReq('http://localhost/api/shift-types/not_exist', adminToken())
    const { DELETE } = await import('@/app/api/shift-types/[id]/route')
    const res = await DELETE(req as unknown as import('next').NextRequest, { params: { id: 'not_exist' } } as unknown as Record<string, string>)
    expect(res.status).toBe(404)
  })
})
