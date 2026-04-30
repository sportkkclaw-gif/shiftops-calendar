/**
 * Staff CRUD API Tests — positive and negative cases
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    staffProfile: {
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

// ─── POST /api/staff ───────────────────────────────────────────────────────────

describe('POST /api/staff', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ ADMIN can create staff', async () => {
    mockPrisma.staffProfile.create.mockResolvedValue({ id: 's1', name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    const { POST } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo' }) })
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(201)
  })

  it('✗ 403: MANAGER cannot create staff in another location', async () => {
    const { POST } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken()}` }, body: JSON.stringify({ name: '王五', roleCode: 'NURSE', color: '#0000FF', organizationId: 'org_demo', locationId: 'loc_other' }) })
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(403)
  })

  it('✗ 403: MEMBER cannot create staff', async () => {
    const { POST } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken()}` }, body: JSON.stringify({ name: '趙六', roleCode: 'NURSE', color: '#FFFF00', organizationId: 'org_demo', locationId: 'loc_demo' }) })
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(403)
  })

  it('✗ 401: unauthenticated', async () => {
    const { POST } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '無名', roleCode: 'NURSE', color: '#FFFFFF', organizationId: 'org_demo', locationId: 'loc_demo' }) })
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
  })

  it('✗ 400: missing required fields', async () => {
    const { POST } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ name: '測試' }) })
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(400)
  })

  it('✗ 400: invalid hex color', async () => {
    const { POST } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ name: '壞顏色', roleCode: 'NURSE', color: 'not-a-color', organizationId: 'org_demo', locationId: 'loc_demo' }) })
    const res = await POST(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/staff ───────────────────────────────────────────────────────────

describe('GET /api/staff', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ ADMIN can list staff', async () => {
    mockPrisma.staffProfile.findMany.mockResolvedValue([{ id: 's1', name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() }])
    mockPrisma.staffProfile.count.mockResolvedValue(1)
    const { GET } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff?organizationId=org_demo', { method: 'GET', headers: { Authorization: `Bearer ${adminToken()}` } })
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.meta.total).toBe(1)
  })

  it('✗ 401: unauthenticated', async () => {
    const { GET } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff?organizationId=org_demo', { method: 'GET' })
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(401)
  })

  it('✗ 400: missing organizationId', async () => {
    const { GET } = await import('@/app/api/staff/route')
    const req = new Request('http://localhost/api/staff', { method: 'GET', headers: { Authorization: `Bearer ${adminToken()}` } })
    const res = await GET(req as unknown as import('next').NextRequest)
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/staff/[id] ─────────────────────────────────────────────────────

describe('GET /api/staff/[id]', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ ADMIN can get staff', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({ id: 's1', name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    const { GET } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/s1', { method: 'GET', headers: { Authorization: `Bearer ${adminToken()}` } })
    const res = await GET(req as unknown as import('next').NextRequest, { params: { id: 's1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(200)
  })

  it('✗ 404: staff not found', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue(null)
    const { GET } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/not_exist', { method: 'GET', headers: { Authorization: `Bearer ${adminToken()}` } })
    const res = await GET(req as unknown as import('next').NextRequest, { params: { id: 'not_exist' } } as unknown as Record<string, string>)
    expect(res.status).toBe(404)
  })

  it('✗ 403: MANAGER cannot get staff in another location', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({ id: 's_other', name: '王五', roleCode: 'NURSE', color: '#0000FF', organizationId: 'org_demo', locationId: 'loc_other', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    const { GET } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/s_other', { method: 'GET', headers: { Authorization: `Bearer ${managerToken()}` } })
    const res = await GET(req as unknown as import('next').NextRequest, { params: { id: 's_other' } } as unknown as Record<string, string>)
    expect(res.status).toBe(403)
  })
})

// ─── PATCH /api/staff/[id] ───────────────────────────────────────────────────

describe('PATCH /api/staff/[id]', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ ADMIN can update staff', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({ id: 's1', name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    mockPrisma.staffProfile.update.mockResolvedValue({ id: 's1', name: '張三更新', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    const { PATCH } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/s1', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ name: '張三更新' }) })
    const res = await PATCH(req as unknown as import('next').NextRequest, { params: { id: 's1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe('張三更新')
  })

  it('✗ 403: MANAGER cannot update staff in another location', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({ id: 's_other', name: '王五', roleCode: 'NURSE', color: '#0000FF', organizationId: 'org_demo', locationId: 'loc_other', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    const { PATCH } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/s_other', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken()}` }, body: JSON.stringify({ name: '新名' }) })
    const res = await PATCH(req as unknown as import('next').NextRequest, { params: { id: 's_other' } } as unknown as Record<string, string>)
    expect(res.status).toBe(403)
  })

  it('✗ 400: invalid color format', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({ id: 's1', name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    const { PATCH } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/s1', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ color: 'blue' }) })
    const res = await PATCH(req as unknown as import('next').NextRequest, { params: { id: 's1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/staff/[id] ───────────────────────────────────────────────────

describe('DELETE /api/staff/[id]', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ ADMIN can delete staff', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({ id: 's1', name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    mockPrisma.staffProfile.delete.mockResolvedValue({ id: 's1' })
    const { DELETE } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/s1', { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken()}` } })
    const res = await DELETE(req as unknown as import('next').NextRequest, { params: { id: 's1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.deleted).toBe(true)
  })

  it('✗ 403: MANAGER cannot delete staff (ADMIN only)', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue({ id: 's1', name: '張三', roleCode: 'NURSE', color: '#FF0000', organizationId: 'org_demo', locationId: 'loc_demo', active: true, email: null, createdAt: new Date(), updatedAt: new Date() })
    const { DELETE } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/s1', { method: 'DELETE', headers: { Authorization: `Bearer ${managerToken()}` } })
    const res = await DELETE(req as unknown as import('next').NextRequest, { params: { id: 's1' } } as unknown as Record<string, string>)
    expect(res.status).toBe(403)
  })

  it('✗ 404: staff not found', async () => {
    mockPrisma.staffProfile.findUnique.mockResolvedValue(null)
    const { DELETE } = await import('@/app/api/staff/[id]/route')
    const req = new Request('http://localhost/api/staff/not_exist', { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken()}` } })
    const res = await DELETE(req as unknown as import('next').NextRequest, { params: { id: 'not_exist' } } as unknown as Record<string, string>)
    expect(res.status).toBe(404)
  })
})
