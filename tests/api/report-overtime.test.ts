/**
 * AI Report + Overtime Candidates API Tests
 * Covers: GET /api/ai/report/coverage, GET /api/ai/report/hours, GET /api/overtime/candidates
 */

process.env.MOCK_AI = 'true'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    location: { findMany: jest.fn() },
    coverageRequirement: { findMany: jest.fn() },
    shiftAssignment: { findMany: jest.fn() },
    overtimeCandidate: { findMany: jest.fn() },
    staffProfile: { findUnique: jest.fn(), select: jest.fn() },
    shiftType: { findUnique: jest.fn() },
  },
}))

jest.mock('@/lib/rbac', () => ({
  requireAuth: jest.fn().mockResolvedValue({ user: { id: 'admin_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo', locationId: 'loc_demo' }, error: null }),
  canAccessLocation: jest.fn().mockReturnValue(true),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────────

function adminToken() {
  const { encodeJWT } = require('@/lib/auth')
  return encodeJWT({ sub: 'admin_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo', locationId: 'loc_demo' })
}

function makeGetReq(url: string, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new Request(url, { method: 'GET', headers })
}

// ─── Route Handlers ─────────────────────────────────────────────────────────────

async function handleCoverage(url: string, token?: string) {
  const { GET } = await import('@/app/api/ai/report/coverage/route')
  return GET(makeGetReq(url, token ?? adminToken()) as unknown as import('next').NextRequest)
}

async function handleHours(url: string, token?: string) {
  const { GET } = await import('@/app/api/ai/report/hours/route')
  return GET(makeGetReq(url, token ?? adminToken()) as unknown as import('next').NextRequest)
}

async function handleOvertimeCandidates(url: string, token?: string) {
  const { GET } = await import('@/app/api/overtime/candidates/route')
  return GET(makeGetReq(url, token ?? adminToken()) as unknown as import('next').NextRequest)
}

// ─── Mocks Setup ────────────────────────────────────────────────────────────────

const mockPrisma = jest.requireMock('@/lib/prisma').prisma

const LOCATIONS_MOCK = [
  { id: 'loc_demo', name: '示範地點' },
  { id: 'loc_two', name: '第二地點' },
]

const SHIFT_ASSIGNMENTS_MOCK = [
  {
    id: 'a1', staffId: 'staff_1', shiftTypeId: 'st_morning', assignmentType: 'REGULAR',
    date: new Date('2026-04-01'), locationId: 'loc_demo', organizationId: 'org_demo',
    staffProfile: { id: 'staff_1', name: '張三', roleCode: 'NURSE' },
    shiftType: { id: 'st_morning', name: '早班', durationMinutes: 480 },
  },
  {
    id: 'a2', staffId: 'staff_2', shiftTypeId: 'st_morning', assignmentType: 'OVERTIME',
    date: new Date('2026-04-01'), locationId: 'loc_demo', organizationId: 'org_demo',
    staffProfile: { id: 'staff_2', name: '李四', roleCode: 'NURSE' },
    shiftType: { id: 'st_morning', name: '早班', durationMinutes: 480 },
  },
  {
    id: 'a3', staffId: 'staff_1', shiftTypeId: 'st_evening', assignmentType: 'REGULAR',
    date: new Date('2026-04-02'), locationId: 'loc_demo', organizationId: 'org_demo',
    staffProfile: { id: 'staff_1', name: '張三', roleCode: 'NURSE' },
    shiftType: { id: 'st_evening', name: '晚班', durationMinutes: 480 },
  },
]

const COVERAGE_REQUIREMENTS_MOCK = [
  { id: 'cr1', shiftTypeId: 'st_morning', minCount: 2, targetCount: 3, organizationId: 'org_demo', locationId: 'loc_demo', weekday: null, date: new Date('2026-04-01'), requiredSkills: null },
  { id: 'cr2', shiftTypeId: 'st_evening', minCount: 1, targetCount: 2, organizationId: 'org_demo', locationId: 'loc_demo', weekday: null, date: new Date('2026-04-02'), requiredSkills: null },
]

const OVERTIME_CANDIDATES_MOCK = [
  {
    id: 'oc1', staffId: 'staff_2', organizationId: 'org_demo', locationId: 'loc_demo',
    date: new Date('2026-04-01'), targetShiftTypeId: 'st_morning', sourceShiftTypeId: 'st_evening',
    reason: 'Coverage gap requires overtime coverage', riskFlags: 'consecutive_shifts,under_4h_rest',
    score: 92.5, status: 'candidate', createdAt: new Date('2026-04-01T10:00:00Z'),
    staffProfile: { id: 'staff_2', name: '李四', roleCode: 'NURSE', color: '#FF0000' },
    targetShiftType: { id: 'st_morning', name: '早班', color: '#00FF00' },
    sourceShiftType: { id: 'st_evening', name: '晚班', color: '#0000FF' },
  },
  {
    id: 'oc2', staffId: 'staff_3', organizationId: 'org_demo', locationId: 'loc_demo',
    date: new Date('2026-04-03'), targetShiftTypeId: 'st_morning', sourceShiftTypeId: null,
    reason: 'Qualified backup available', riskFlags: '',
    score: 78.0, status: 'candidate', createdAt: new Date('2026-04-02T08:00:00Z'),
    staffProfile: { id: 'staff_3', name: '王五', roleCode: 'NURSE', color: '#FFFF00' },
    targetShiftType: { id: 'st_morning', name: '早班', color: '#00FF00' },
    sourceShiftType: null,
  },
]

// ─── Tests: GET /api/ai/report/coverage ────────────────────────────────────────

describe('GET /api/ai/report/coverage', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: returns coverage summary with data/meta wrapper', async () => {
    mockPrisma.location.findMany.mockResolvedValue(LOCATIONS_MOCK)
    mockPrisma.coverageRequirement.findMany.mockResolvedValue(COVERAGE_REQUIREMENTS_MOCK)
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)

    const res = await handleCoverage('http://localhost/api/ai/report/coverage?organizationId=org_demo&startDate=2026-04-01&endDate=2026-04-30')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json.data).toHaveProperty('locations')
    expect(json.data).toHaveProperty('totalLocations')
    expect(json.meta).toHaveProperty('requestId')
  })

  it('✓ success: filters by locationId', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.coverageRequirement.findMany.mockResolvedValue(COVERAGE_REQUIREMENTS_MOCK)
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)

    const res = await handleCoverage('http://localhost/api/ai/report/coverage?organizationId=org_demo&locationId=loc_demo&startDate=2026-04-01&endDate=2026-04-30')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.locations).toHaveLength(1)
    expect(json.data.locations[0].locationId).toBe('loc_demo')
  })

  it('✗ 400: missing organizationId', async () => {
    const res = await handleCoverage('http://localhost/api/ai/report/coverage')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  // (auth 401 case covered in tests/api/auth.test.ts)
})

// ─── Tests: GET /api/ai/report/hours ───────────────────────────────────────────

describe('GET /api/ai/report/hours', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: returns hours summary by staff with totals', async () => {
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)

    const res = await handleHours('http://localhost/api/ai/report/hours?organizationId=org_demo&startDate=2026-04-01&endDate=2026-04-30')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json.data).toHaveProperty('staff')
    expect(json.data).toHaveProperty('totals')
    expect(Array.isArray(json.data.staff)).toBe(true)
    expect(json.data.totals).toHaveProperty('totalStaff')
    expect(json.data.totals).toHaveProperty('totalRegularMinutes')
    expect(json.data.totals).toHaveProperty('totalOvertimeMinutes')
  })

  it('✓ success: overtime assignments counted separately from regular', async () => {
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)

    const res = await handleHours('http://localhost/api/ai/report/hours?organizationId=org_demo&startDate=2026-04-01&endDate=2026-04-30')
    expect(res.status).toBe(200)
    const json = await res.json()
    const staff2 = json.data.staff.find((s: { staffId: string }) => s.staffId === 'staff_2')
    expect(staff2.overtimeMinutes).toBe(480)
    expect(staff2.regularMinutes).toBe(0)
  })

  it('✗ 400: missing organizationId', async () => {
    const res = await handleHours('http://localhost/api/ai/report/hours')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✓ success: filters by locationId', async () => {
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([SHIFT_ASSIGNMENTS_MOCK[0]])

    const res = await handleHours('http://localhost/api/ai/report/hours?organizationId=org_demo&locationId=loc_demo&startDate=2026-04-01&endDate=2026-04-30')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.staff).toBeDefined()
  })
})

// ─── Tests: GET /api/overtime/candidates ───────────────────────────────────────

describe('GET /api/overtime/candidates', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ success: returns overtime candidates with reason/risk info', async () => {
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OVERTIME_CANDIDATES_MOCK)

    const res = await handleOvertimeCandidates('http://localhost/api/overtime/candidates?organizationId=org_demo')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json.data).toHaveProperty('candidates')
    expect(json.data.candidates).toHaveLength(2)
    expect(json.data.total).toBe(2)
    expect(json.data.candidates[0]).toHaveProperty('reason')
    expect(json.data.candidates[0]).toHaveProperty('riskFlags')
    expect(json.data.candidates[0]).toHaveProperty('score')
    expect(json.data.candidates[0]).toHaveProperty('staffName')
    expect(json.data.candidates[0]).toHaveProperty('targetShiftTypeName')
  })

  it('✓ success: riskFlags parsed as array from comma-separated string', async () => {
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue([OVERTIME_CANDIDATES_MOCK[0]])

    const res = await handleOvertimeCandidates('http://localhost/api/overtime/candidates?organizationId=org_demo')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data.candidates[0].riskFlags)).toBe(true)
    expect(json.data.candidates[0].riskFlags).toContain('consecutive_shifts')
    expect(json.data.candidates[0].riskFlags).toContain('under_4h_rest')
  })

  it('✓ success: sorted by score descending', async () => {
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OVERTIME_CANDIDATES_MOCK)

    const res = await handleOvertimeCandidates('http://localhost/api/overtime/candidates?organizationId=org_demo')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.candidates[0].score).toBeGreaterThanOrEqual(json.data.candidates[1].score)
  })

  it('✓ success: filters by date range', async () => {
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue([OVERTIME_CANDIDATES_MOCK[0]])

    const res = await handleOvertimeCandidates('http://localhost/api/overtime/candidates?organizationId=org_demo&date=2026-04-01&endDate=2026-04-01')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.candidates).toHaveLength(1)
    expect(json.data.filters.date).toBe('2026-04-01')
  })

  it('✓ success: filters by locationId', async () => {
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OVERTIME_CANDIDATES_MOCK)

    const res = await handleOvertimeCandidates('http://localhost/api/overtime/candidates?organizationId=org_demo&locationId=loc_demo')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.candidates.every((c: { locationId: string }) => c.locationId === 'loc_demo')).toBe(true)
  })

  it('✗ 400: missing organizationId', async () => {
    const res = await handleOvertimeCandidates('http://localhost/api/overtime/candidates')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✓ success: filters by status', async () => {
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue([OVERTIME_CANDIDATES_MOCK[0]])

    const res = await handleOvertimeCandidates('http://localhost/api/overtime/candidates?organizationId=org_demo&status=candidate')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(mockPrisma.overtimeCandidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'candidate' }),
      })
    )
  })
})