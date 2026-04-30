/**
 * Holiday & AI Preferences API Tests
 * Covers: GET /api/data/holidays, PATCH /api/ai/preferences
 */

process.env.MOCK_AI = 'true'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    holiday: {
      findMany: jest.fn(),
    },
    lunarDate: {
      findMany: jest.fn(),
    },
    userAiPreference: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/rbac', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user_manager', email: 'manager@shiftops.local', role: 'MANAGER', organizationId: 'org_demo', locationId: 'loc_demo' },
    error: null,
  }),
  canAccessLocation: jest.fn().mockReturnValue(true),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────────

function managerToken() {
  const { encodeJWT } = require('@/lib/auth')
  return encodeJWT({ sub: 'user_manager', email: 'manager@shiftops.local', role: 'MANAGER', organizationId: 'org_demo', locationId: 'loc_demo' })
}

function makeGetReq(url: string, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new Request(url, { method: 'GET', headers })
}

function makePatchReq(url: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new Request(url, { method: 'PATCH', headers, body: JSON.stringify(body) })
}

// ─── Mocks Setup ────────────────────────────────────────────────────────────────

const mockPrisma = jest.requireMock('@/lib/prisma').prisma

const MOCK_HOLIDAYS = [
  { id: 'hol_2026_0501', organizationId: 'org_demo', locationId: 'loc_demo', date: new Date('2026-05-01'), name: '勞動節', description: '勞動節假期', source: 'national', createdAt: new Date(), updatedAt: new Date() },
  { id: 'hol_2026_0503', organizationId: 'org_demo', locationId: 'loc_demo', date: new Date('2026-05-03'), name: '端午節', description: '端午節假期', source: 'lunar', createdAt: new Date(), updatedAt: new Date() },
]

const MOCK_LUNAR_DATES = [
  { id: 'ln_2026_0815', organizationId: 'org_demo', locationId: 'loc_demo', lunarYear: 2026, lunarMonth: 8, lunarDay: 15, solarDate: new Date('2026-09-08'), name: '中秋節', description: '農曆八月十五', source: 'lunar', createdAt: new Date(), updatedAt: new Date() },
]

// ─── Route Handlers ─────────────────────────────────────────────────────────────

async function handleHolidays(url: string, token?: string) {
  const { GET } = await import('@/app/api/data/holidays/route')
  return GET(makeGetReq(url, token) as unknown as import('next').NextRequest)
}

async function handlePreferences(url: string, token?: string) {
  const { GET } = await import('@/app/api/ai/preferences/route')
  return GET(makeGetReq(url, token) as unknown as import('next').NextRequest)
}

async function handlePreferencesPatch(url: string, body: unknown, token?: string) {
  const { PATCH } = await import('@/app/api/ai/preferences/route')
  return PATCH(makePatchReq(url, body, token) as unknown as import('next').NextRequest)
}

// ─── Tests: GET /api/data/holidays ───────────────────────────────────────────────

describe('GET /api/data/holidays', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: returns holidays and lunar dates for org_demo', async () => {
    mockPrisma.holiday.findMany.mockResolvedValue(MOCK_HOLIDAYS)
    mockPrisma.lunarDate.findMany.mockResolvedValue(MOCK_LUNAR_DATES)

    const res = await handleHolidays('http://localhost/api/data/holidays?organizationId=org_demo')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json.data).toHaveProperty('holidays')
    expect(json.data).toHaveProperty('lunarDates')
    expect(json.data.holidays).toHaveLength(2)
    expect(json.data.lunarDates).toHaveLength(1)
  })

  it('✓ success: includes May 2026 holidays in summary', async () => {
    mockPrisma.holiday.findMany.mockResolvedValue(MOCK_HOLIDAYS)
    mockPrisma.lunarDate.findMany.mockResolvedValue([])

    const res = await handleHolidays('http://localhost/api/data/holidays?organizationId=org_demo&year=2026')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.summary.may2026HolidayCount).toBeGreaterThan(0)
    expect(json.data.holidays.some((h: { date: Date }) => new Date(h.date).getMonth() === 4)).toBe(true)
  })

  it('✓ success: returns empty arrays when no records', async () => {
    mockPrisma.holiday.findMany.mockResolvedValue([])
    mockPrisma.lunarDate.findMany.mockResolvedValue([])

    const res = await handleHolidays('http://localhost/api/data/holidays?organizationId=org_unknown')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.holidays).toHaveLength(0)
    expect(json.data.lunarDates).toHaveLength(0)
  })

  it('✓ success: filters by locationId', async () => {
    mockPrisma.holiday.findMany.mockResolvedValue([MOCK_HOLIDAYS[0]])
    mockPrisma.lunarDate.findMany.mockResolvedValue([])

    const res = await handleHolidays('http://localhost/api/data/holidays?organizationId=org_demo&locationId=loc_demo')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.holidays).toHaveLength(1)
    expect(mockPrisma.holiday.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationId: 'loc_demo' }),
      })
    )
  })

  it('✓ success: includeLunar=false skips lunar query', async () => {
    mockPrisma.holiday.findMany.mockResolvedValue(MOCK_HOLIDAYS)
    mockPrisma.lunarDate.findMany.mockResolvedValue([])

    const res = await handleHolidays('http://localhost/api/data/holidays?organizationId=org_demo&includeLunar=false')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.lunarDates).toHaveLength(0)
    expect(mockPrisma.lunarDate.findMany).not.toHaveBeenCalled()
  })

  it('✗ 500: internal error when db throws', async () => {
    mockPrisma.holiday.findMany.mockRejectedValue(new Error('DB error'))

    const res = await handleHolidays('http://localhost/api/data/holidays?organizationId=org_demo')
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error.code).toBe('INTERNAL_ERROR')
  })
})

// ─── Tests: GET /api/ai/preferences ─────────────────────────────────────────────

describe('GET /api/ai/preferences', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: returns null when no preference exists', async () => {
    mockPrisma.userAiPreference.findFirst.mockResolvedValue(null)

    const res = await handlePreferences('http://localhost/api/ai/preferences?organizationId=org_demo&preferenceKey=default')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeNull()
    expect(json.meta).toHaveProperty('requestId')
  })

  it('✓ success: returns preference when found', async () => {
    mockPrisma.userAiPreference.findFirst.mockResolvedValue({
      id: 'pref_1',
      userId: 'user_manager',
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      preferenceKey: 'default',
      preferenceJson: '{"theme":"dark","language":"zh-TW"}',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await handlePreferences('http://localhost/api/ai/preferences?organizationId=org_demo&preferenceKey=default')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).not.toBeNull()
    expect(json.data.preferenceKey).toBe('default')
    expect(json.data.preferenceJson).toBe('{"theme":"dark","language":"zh-TW"}')
  })

  it('✓ success: falls back to user.organizationId when orgId not in query', async () => {
    mockPrisma.userAiPreference.findFirst.mockResolvedValue(null)

    const res = await handlePreferences('http://localhost/api/ai/preferences?preferenceKey=default')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeNull()
    // Should use auth.user.organizationId ('org_demo') as default
    expect(mockPrisma.userAiPreference.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org_demo' }),
      })
    )
  })
})

// ─── Tests: PATCH /api/ai/preferences ──────────────────────────────────────────

describe('PATCH /api/ai/preferences', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: creates new preference via upsert', async () => {
    mockPrisma.userAiPreference.upsert.mockResolvedValue({
      id: 'pref_new',
      userId: 'user_manager',
      organizationId: 'org_demo',
      locationId: null,
      preferenceKey: 'default',
      preferenceJson: '{"theme":"light"}',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await handlePreferencesPatch(
      'http://localhost/api/ai/preferences',
      { organizationId: 'org_demo', preferenceKey: 'default', preferenceJson: '{"theme":"light"}' },
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveProperty('id')
    expect(json.data.preferenceJson).toBe('{"theme":"light"}')
    expect(mockPrisma.userAiPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_organizationId_preferenceKey: { userId: 'user_manager', organizationId: 'org_demo', preferenceKey: 'default' } },
        update: expect.any(Object),
        create: expect.any(Object),
      })
    )
  })

  it('✓ success: updates existing preference via upsert', async () => {
    mockPrisma.userAiPreference.upsert.mockResolvedValue({
      id: 'pref_existing',
      userId: 'user_manager',
      organizationId: 'org_demo',
      locationId: null,
      preferenceKey: 'default',
      preferenceJson: '{"theme":"dark"}',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await handlePreferencesPatch(
      'http://localhost/api/ai/preferences',
      { organizationId: 'org_demo', preferenceKey: 'default', preferenceJson: '{"theme":"dark"}' },
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.preferenceJson).toBe('{"theme":"dark"}')
  })

  it('✗ 400: invalid JSON in preferenceJson', async () => {
    const res = await handlePreferencesPatch(
      'http://localhost/api/ai/preferences',
      { organizationId: 'org_demo', preferenceKey: 'default', preferenceJson: 'not-valid-json' },
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.message).toContain('valid JSON')
  })

  it('✗ 400: missing required fields', async () => {
    const res = await handlePreferencesPatch(
      'http://localhost/api/ai/preferences',
      { organizationId: 'org_demo' }, // missing preferenceKey and preferenceJson
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✗ 400: preferenceKey too long (>128 chars)', async () => {
    const longKey = 'a'.repeat(130)
    const res = await handlePreferencesPatch(
      'http://localhost/api/ai/preferences',
      { organizationId: 'org_demo', preferenceKey: longKey, preferenceJson: '{}' },
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✗ 500: internal error when db throws', async () => {
    mockPrisma.userAiPreference.upsert.mockRejectedValue(new Error('DB error'))

    const res = await handlePreferencesPatch(
      'http://localhost/api/ai/preferences',
      { organizationId: 'org_demo', preferenceKey: 'default', preferenceJson: '{"test":true}' },
    )
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error.code).toBe('INTERNAL_ERROR')
  })
})
