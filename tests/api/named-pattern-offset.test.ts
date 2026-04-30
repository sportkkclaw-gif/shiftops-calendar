/**
 * C23 Unit Tests: NamedPatternSeed Offset API
 * GET /api/schedule/named-patterns/[id]
 * PATCH /api/schedule/named-patterns/[id]
 *
 * Covers: phaseOffset, shiftGroupOffset, cycleDays adjustment via API.
 */

process.env.MOCK_AI = 'true'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    namedPatternSeed: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditEvent: { create: jest.fn().mockResolvedValue({ id: 'audit_new' }) },
  },
}))

jest.mock('@/lib/rbac', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'admin_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo' },
    error: null,
  }),
  canAccessLocation: jest.fn().mockReturnValue(true),
}))

const mockPrisma = jest.requireMock('@/lib/prisma').prisma

const SEED_MOCK = {
  id: 'pattern_2-2-3',
  name: '2-2-3',
  patternType: 'fixed_rotation',
  description: '兩天早班、兩天午班、三天休息',
  defaultConfig: JSON.stringify({ cycle: [2, 2, 3], cycleDays: 7, phaseOffset: 0, shiftGroupOffset: 0 }),
}

const SEED_LIST = [
  SEED_MOCK,
  {
    id: 'pattern_5-2',
    name: '5-2',
    patternType: 'fixed_rotation',
    description: '五天工作、兩天休息',
    defaultConfig: JSON.stringify({ cycle: [5, 2], cycleDays: 7, phaseOffset: 1, shiftGroupOffset: 0 }),
  },
]

function adminToken() {
  const { encodeJWT } = require('@/lib/auth')
  return encodeJWT({ sub: 'admin_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo' })
}

function makeReq(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function handleGetOne(id: string) {
  const { GET } = await import('@/app/api/schedule/named-patterns/[id]/route')
  return GET(makeReq('GET', `/api/schedule/named-patterns/${id}`, undefined, adminToken()) as unknown as import('next').NextRequest, { params: { id } } as unknown as import('next').NextRequest)
}

async function handlePatch(id: string, body: unknown) {
  const { PATCH } = await import('@/app/api/schedule/named-patterns/[id]/route')
  return PATCH(makeReq('PATCH', `/api/schedule/named-patterns/${id}`, body, adminToken()) as unknown as import('next').NextRequest, { params: { id } } as unknown as import('next').NextRequest)
}

async function handleList() {
  const { GET } = await import('@/app/api/schedule/named-patterns/route')
  return GET(makeReq('GET', '/api/schedule/named-patterns', undefined, adminToken()) as unknown as import('next').NextRequest, { params: {} } as unknown as import('next').NextRequest)
}

describe('C23: NamedPatternSeed Offset API', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('GET /api/schedule/named-patterns/[id]', () => {
    it('returns seed with resolved offset fields', async () => {
      mockPrisma.namedPatternSeed.findUnique.mockResolvedValue(SEED_MOCK)

      const res = await handleGetOne('pattern_2-2-3')
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toMatchObject({
        id: 'pattern_2-2-3',
        name: '2-2-3',
        patternType: 'fixed_rotation',
        phaseOffset: 0,
        shiftGroupOffset: 0,
        cycleDays: 7,
      })
    })

    it('returns 404 for unknown seed', async () => {
      mockPrisma.namedPatternSeed.findUnique.mockResolvedValue(null)

      const res = await handleGetOne('unknown')
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/schedule/named-patterns/[id]', () => {
    it('updates phaseOffset and returns updated seed', async () => {
      mockPrisma.namedPatternSeed.findUnique.mockResolvedValue(SEED_MOCK)
      mockPrisma.namedPatternSeed.update.mockImplementation(async ({ where, data }) => ({
        ...SEED_MOCK,
        defaultConfig: data.defaultConfig,
      }))

      const res = await handlePatch('pattern_2-2-3', { phaseOffset: 3 })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.phaseOffset).toBe(3)
      expect(mockPrisma.namedPatternSeed.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pattern_2-2-3' } })
      )
    })

    it('updates shiftGroupOffset independently', async () => {
      mockPrisma.namedPatternSeed.findUnique.mockResolvedValue(SEED_MOCK)
      mockPrisma.namedPatternSeed.update.mockImplementation(async ({ where, data }) => ({
        ...SEED_MOCK,
        defaultConfig: data.defaultConfig,
      }))

      const res = await handlePatch('pattern_2-2-3', { shiftGroupOffset: 2 })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.shiftGroupOffset).toBe(2)
    })

    it('updates cycleDays', async () => {
      mockPrisma.namedPatternSeed.findUnique.mockResolvedValue(SEED_MOCK)
      mockPrisma.namedPatternSeed.update.mockImplementation(async ({ where, data }) => ({
        ...SEED_MOCK,
        defaultConfig: data.defaultConfig,
      }))

      const res = await handlePatch('pattern_2-2-3', { cycleDays: 14 })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.cycleDays).toBe(14)
    })

    it('rejects invalid phaseOffset (negative)', async () => {
      mockPrisma.namedPatternSeed.findUnique.mockResolvedValue(SEED_MOCK)

      const res = await handlePatch('pattern_2-2-3', { phaseOffset: -1 })
      expect(res.status).toBe(400)
    })

    it('rejects invalid phaseOffset (too large)', async () => {
      mockPrisma.namedPatternSeed.findUnique.mockResolvedValue(SEED_MOCK)

      const res = await handlePatch('pattern_2-2-3', { phaseOffset: 10 })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/schedule/named-patterns (list)', () => {
    it('returns all seeds with resolved offset fields', async () => {
      mockPrisma.namedPatternSeed.findMany.mockResolvedValue(SEED_LIST)

      const res = await handleList()
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveLength(2)
      expect(json.data[0]).toMatchObject({
        id: 'pattern_2-2-3',
        name: '2-2-3',
        phaseOffset: 0,
        shiftGroupOffset: 0,
        cycleDays: 7,
      })
      expect(json.data[1]).toMatchObject({
        id: 'pattern_5-2',
        name: '5-2',
        phaseOffset: 1,
        shiftGroupOffset: 0,
        cycleDays: 7,
      })
    })
  })
})
