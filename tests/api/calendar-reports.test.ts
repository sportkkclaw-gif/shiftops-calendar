/**
 * Calendar Projection + Day Inspector + Reports Analytics API Tests
 * Covers: GET /api/calendar/projection, GET /api/calendar/day-inspector,
 *         GET /api/ai/coverage-summary, GET /api/reports/analytics
 */

process.env.MOCK_AI = 'true'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    location: { findMany: jest.fn() },
    shiftRule: { findMany: jest.fn() },
    shiftAssignment: {
      findMany: jest.fn(),
      include: jest.fn(),
    },
    calendarDayProjection: { findMany: jest.fn() },
    coverageRequirement: { findMany: jest.fn() },
    coverageAlert: { findMany: jest.fn(), include: jest.fn() },
    overtimeCandidate: { findMany: jest.fn(), orderBy: jest.fn() },
    shiftType: { findMany: jest.fn(), findUnique: jest.fn() },
    staffProfile: { select: jest.fn() },
  },
}))

jest.mock('@/lib/rbac', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'admin_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo', locationId: 'loc_demo' },
    error: null,
  }),
  canAccessLocation: jest.fn().mockReturnValue(true),
}))

function adminToken() {
  const { encodeJWT } = require('@/lib/auth')
  return encodeJWT({ sub: 'admin_1', email: 'admin@test.com', role: 'ADMIN', organizationId: 'org_demo', locationId: 'loc_demo' })
}

function makeGetReq(url: string, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new Request(url, { method: 'GET', headers })
}

async function handleProjection(url: string) {
  const { GET } = await import('@/app/api/calendar/projection/route')
  return GET(makeGetReq(url, adminToken()) as unknown as import('next').NextRequest)
}

async function handleDayInspector(url: string) {
  const { GET } = await import('@/app/api/calendar/day-inspector/route')
  return GET(makeGetReq(url, adminToken()) as unknown as import('next').NextRequest)
}

async function handleCoverageSummary(url: string) {
  const { GET } = await import('@/app/api/ai/coverage-summary/route')
  return GET(makeGetReq(url, adminToken()) as unknown as import('next').NextRequest)
}

async function handleReportsAnalytics(url: string) {
  const { GET } = await import('@/app/api/reports/analytics/route')
  return GET(makeGetReq(url, adminToken()) as unknown as import('next').NextRequest)
}

const mockPrisma = jest.requireMock('@/lib/prisma').prisma

const LOCATIONS_MOCK = [
  { id: 'loc_demo', name: '台北總部' },
  { id: 'loc_two', name: '台中分部' },
]

const SHIFT_RULES_MOCK = [
  {
    id: 'rule_3on1off',
    name: '做三休一制',
    patternType: 'n_on_m_off',
    patternName: '3-1',
    patternConfig: JSON.stringify({ n: 3, m: 1, cycleDays: 4 }),
    scopeFilter: JSON.stringify({ locationId: 'loc_demo' }),
    priority: 100,
  },
  {
    id: 'rule_ab',
    name: 'A/B 輪替',
    patternType: 'ab_rotation',
    patternName: 'A-B',
    patternConfig: JSON.stringify({ cycleDays: 2 }),
    scopeFilter: JSON.stringify({ locationId: 'loc_demo' }),
    priority: 100,
  },
]

const SHIFT_TYPES_MOCK = [
  { id: 'st_morning', name: '早班', color: '#3B82F6', durationMinutes: 480 },
  { id: 'st_afternoon', name: '午班', color: '#10B981', durationMinutes: 480 },
  { id: 'st_off', name: '休息', color: '#888888', durationMinutes: 0 },
]

const SHIFT_ASSIGNMENTS_MOCK = [
  {
    id: 'a1',
    staffId: 'staff_1',
    shiftTypeId: 'st_morning',
    assignmentType: 'REGULAR',
    date: new Date('2026-04-01'),
    locationId: 'loc_demo',
    organizationId: 'org_demo',
    status: 'confirmed',
    note: null,
    staffProfile: { id: 'staff_1', name: '王小明', color: '#3B82F6', roleCode: 'NURSE' },
    shiftType: { id: 'st_morning', name: '早班', color: '#3B82F6', startTime: '08:00', endTime: '16:00' },
  },
  {
    id: 'a2',
    staffId: 'staff_2',
    shiftTypeId: 'st_morning',
    assignmentType: 'REGULAR',
    date: new Date('2026-04-01'),
    locationId: 'loc_demo',
    organizationId: 'org_demo',
    status: 'confirmed',
    note: null,
    staffProfile: { id: 'staff_2', name: '李小華', color: '#10B981', roleCode: 'NURSE' },
    shiftType: { id: 'st_morning', name: '早班', color: '#3B82F6', startTime: '08:00', endTime: '16:00' },
  },
]

const COVERAGE_REQUIREMENTS_MOCK = [
  { id: 'cr1', shiftTypeId: 'st_morning', minCount: 2, targetCount: 3, organizationId: 'org_demo', locationId: 'loc_demo', weekday: 1, date: null, requiredSkills: null },
  { id: 'cr2', shiftTypeId: 'st_morning', minCount: 2, targetCount: 3, organizationId: 'org_demo', locationId: 'loc_demo', weekday: null, date: null, requiredSkills: null },
]

const COVERAGE_ALERTS_MOCK = [
  {
    id: 'alert_1',
    locationId: 'loc_demo',
    organizationId: 'org_demo',
    date: new Date('2026-04-01'),
    shiftTypeId: 'st_morning',
    severity: 'warning',
    status: 'GENERATED',
    message: '早班覆蓋人數低於目標',
    details: JSON.stringify({ required: 2, actual: 1 }),
    shiftType: { id: 'st_morning', name: '早班', color: '#3B82F6' },
  },
]

const OT_CANDIDATES_MOCK = [
  {
    id: 'otc_1',
    staffId: 'staff_3',
    organizationId: 'org_demo',
    locationId: 'loc_demo',
    date: new Date('2026-04-01'),
    targetShiftTypeId: 'st_morning',
    sourceShiftTypeId: 'st_afternoon',
    reason: 'Coverage gap requires overtime',
    riskFlags: 'consecutive_shifts,under_4h_rest',
    score: 88.5,
    status: 'candidate',
    createdAt: new Date('2026-04-01T08:00:00Z'),
    staffProfile: { id: 'staff_3', name: '陳大山', color: '#F59E0B', roleCode: 'NURSE' },
    targetShiftType: { id: 'st_morning', name: '早班', color: '#3B82F6' },
    sourceShiftType: { id: 'st_afternoon', name: '午班', color: '#10B981' },
  },
]

// ─── Tests: GET /api/calendar/projection ───────────────────────────────────────

describe('GET /api/calendar/projection', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ 200: returns per-day projections for month', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.shiftRule.findMany.mockResolvedValue(SHIFT_RULES_MOCK)
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)
    mockPrisma.coverageRequirement.findMany.mockResolvedValue(COVERAGE_REQUIREMENTS_MOCK)
    mockPrisma.calendarDayProjection.findMany.mockResolvedValue([])

    const res = await handleProjection('http://localhost/api/calendar/projection?organizationId=org_demo&locationId=loc_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json.data).toHaveProperty('month', '2026-04')
    expect(json.data).toHaveProperty('projections')
    expect(Array.isArray(json.data.projections)).toBe(true)
    expect(json.data.totalDays).toBe(30)
    expect(json.meta).toHaveProperty('requestId')
  })

  it('✓ 200: projections include ruleProjections with phaseLabel', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.shiftRule.findMany.mockResolvedValue([SHIFT_RULES_MOCK[0]])
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([])
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)
    mockPrisma.coverageRequirement.findMany.mockResolvedValue([])
    mockPrisma.calendarDayProjection.findMany.mockResolvedValue([])

    const res = await handleProjection('http://localhost/api/calendar/projection?organizationId=org_demo&locationId=loc_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    const firstDay = json.data.projections.find((p: { date: string }) => p.date === '2026-04-01')
    expect(firstDay).toHaveProperty('ruleProjections')
    expect(Array.isArray(firstDay.ruleProjections)).toBe(true)
    expect(firstDay).toHaveProperty('coverageStatus')
    expect(firstDay).toHaveProperty('tokens')
  })

  it('✓ 200: tokens capped at 3 with hiddenCount', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.shiftRule.findMany.mockResolvedValue([SHIFT_RULES_MOCK[0], SHIFT_RULES_MOCK[1]])
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([])
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)
    mockPrisma.coverageRequirement.findMany.mockResolvedValue([])
    mockPrisma.calendarDayProjection.findMany.mockResolvedValue([])

    const res = await handleProjection('http://localhost/api/calendar/projection?organizationId=org_demo&locationId=loc_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.projections[0].tokens.length).toBeLessThanOrEqual(3)
  })

  it('✗ 400: missing organizationId', async () => {
    const res = await handleProjection('http://localhost/api/calendar/projection?month=2026-04')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✗ 400: missing month', async () => {
    const res = await handleProjection('http://localhost/api/calendar/projection?organizationId=org_demo')
    expect(res.status).toBe(400)
  })

  it('✗ 400: invalid month format', async () => {
    const res = await handleProjection('http://localhost/api/calendar/projection?organizationId=org_demo&month=2026-13')
    expect(res.status).toBe(400)
  })
})

// ─── Tests: GET /api/calendar/day-inspector ─────────────────────────────────────

describe('GET /api/calendar/day-inspector', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ 200: returns day detail with assignments, rule projections, OT candidates', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)
    mockPrisma.shiftRule.findMany.mockResolvedValue(SHIFT_RULES_MOCK)
    mockPrisma.coverageAlert.findMany.mockResolvedValue(COVERAGE_ALERTS_MOCK)
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OT_CANDIDATES_MOCK)
    mockPrisma.coverageRequirement.findMany.mockResolvedValue(COVERAGE_REQUIREMENTS_MOCK)

    const res = await handleDayInspector('http://localhost/api/calendar/day-inspector?organizationId=org_demo&locationId=loc_demo&date=2026-04-01')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveProperty('date', '2026-04-01')
    expect(json.data).toHaveProperty('weekday')
    expect(json.data).toHaveProperty('weekdayName')
    expect(json.data).toHaveProperty('locations')
    expect(Array.isArray(json.data.locations)).toBe(true)
    expect(json.data.locations[0]).toHaveProperty('ruleProjections')
    expect(json.data.locations[0]).toHaveProperty('assignments')
    expect(json.data.locations[0]).toHaveProperty('overtimeCandidates')
  })

  it('✓ 200: overtimeCandidates include riskFlags as array', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([])
    mockPrisma.shiftRule.findMany.mockResolvedValue([])
    mockPrisma.coverageAlert.findMany.mockResolvedValue([])
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OT_CANDIDATES_MOCK)
    mockPrisma.coverageRequirement.findMany.mockResolvedValue([])

    const res = await handleDayInspector('http://localhost/api/calendar/day-inspector?organizationId=org_demo&locationId=loc_demo&date=2026-04-01')
    expect(res.status).toBe(200)
    const json = await res.json()
    const loc = json.data.locations[0]
    expect(loc.overtimeCandidates[0]).toHaveProperty('riskFlags')
    expect(Array.isArray(loc.overtimeCandidates[0].riskFlags)).toBe(true)
    expect(loc.overtimeCandidates[0].riskFlags).toContain('consecutive_shifts')
  })

  it('✗ 400: missing organizationId', async () => {
    const res = await handleDayInspector('http://localhost/api/calendar/day-inspector?date=2026-04-01')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✗ 400: invalid date format', async () => {
    const res = await handleDayInspector('http://localhost/api/calendar/day-inspector?organizationId=org_demo&date=2026/04/01')
    expect(res.status).toBe(400)
  })
})

// ─── Tests: GET /api/ai/coverage-summary ───────────────────────────────────────

describe('GET /api/ai/coverage-summary', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ 200: returns coverage summary with shiftTypeGaps and narrative', async () => {
    mockPrisma.location.findMany.mockResolvedValue(LOCATIONS_MOCK)
    mockPrisma.coverageRequirement.findMany.mockResolvedValue(COVERAGE_REQUIREMENTS_MOCK)
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)
    mockPrisma.coverageAlert.findMany.mockResolvedValue(COVERAGE_ALERTS_MOCK)
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OT_CANDIDATES_MOCK)
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)

    const res = await handleCoverageSummary('http://localhost/api/ai/coverage-summary?organizationId=org_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json.data).toHaveProperty('month', '2026-04')
    expect(json.data).toHaveProperty('totalAlerts')
    expect(json.data).toHaveProperty('locations')
    expect(Array.isArray(json.data.locations)).toBe(true)
    expect(json.data.locations[0]).toHaveProperty('shiftTypeGaps')
    expect(json.data.locations[0]).toHaveProperty('narrative')
    expect(json.data.locations[0]).toHaveProperty('alertSummary')
    expect(json.data.locations[0]).toHaveProperty('otSummary')
  })

  it('✓ 200: locationId filter works', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.coverageRequirement.findMany.mockResolvedValue(COVERAGE_REQUIREMENTS_MOCK)
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)
    mockPrisma.coverageAlert.findMany.mockResolvedValue(COVERAGE_ALERTS_MOCK)
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OT_CANDIDATES_MOCK)
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)

    const res = await handleCoverageSummary('http://localhost/api/ai/coverage-summary?organizationId=org_demo&locationId=loc_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.locations).toHaveLength(1)
    expect(json.data.locations[0].locationId).toBe('loc_demo')
  })

  it('✗ 400: missing organizationId', async () => {
    const res = await handleCoverageSummary('http://localhost/api/ai/coverage-summary?month=2026-04')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✗ 400: invalid month format', async () => {
    const res = await handleCoverageSummary('http://localhost/api/ai/coverage-summary?organizationId=org_demo&month=202604')
    expect(res.status).toBe(400)
  })
})

// ─── Tests: GET /api/reports/analytics ─────────────────────────────────────────

describe('GET /api/reports/analytics', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('✓ 200: returns heatmap, barChart, table, alertTrend, otSummary', async () => {
    mockPrisma.location.findMany.mockResolvedValue(LOCATIONS_MOCK)
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)
    mockPrisma.coverageAlert.findMany.mockResolvedValue(COVERAGE_ALERTS_MOCK)
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue(OT_CANDIDATES_MOCK)

    const res = await handleReportsAnalytics('http://localhost/api/reports/analytics?organizationId=org_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveProperty('heatmap')
    expect(json.data).toHaveProperty('barChart')
    expect(json.data).toHaveProperty('table')
    expect(json.data).toHaveProperty('alertTrend')
    expect(json.data).toHaveProperty('otSummary')
    expect(json.data).toHaveProperty('shiftTypes')
  })

  it('✓ 200: barChart entries have regularHours and overtimeHours', async () => {
    mockPrisma.location.findMany.mockResolvedValue(LOCATIONS_MOCK)
    mockPrisma.shiftAssignment.findMany.mockResolvedValue(SHIFT_ASSIGNMENTS_MOCK)
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)
    mockPrisma.coverageAlert.findMany.mockResolvedValue([])
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue([])

    const res = await handleReportsAnalytics('http://localhost/api/reports/analytics?organizationId=org_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    const entry = json.data.barChart[0]
    expect(entry).toHaveProperty('regularHours')
    expect(entry).toHaveProperty('overtimeHours')
    expect(entry).toHaveProperty('totalHours')
    expect(entry).toHaveProperty('staffId')
    expect(entry).toHaveProperty('name')
  })

  it('✓ 200: table columns include shiftType IDs', async () => {
    mockPrisma.location.findMany.mockResolvedValue([LOCATIONS_MOCK[0]])
    mockPrisma.shiftAssignment.findMany.mockResolvedValue([])
    mockPrisma.shiftType.findMany.mockResolvedValue(SHIFT_TYPES_MOCK)
    mockPrisma.coverageAlert.findMany.mockResolvedValue([])
    mockPrisma.overtimeCandidate.findMany.mockResolvedValue([])

    const res = await handleReportsAnalytics('http://localhost/api/reports/analytics?organizationId=org_demo&month=2026-04')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.table.columns).toContain('st_morning')
    expect(json.data.table.columns).toContain('st_afternoon')
    expect(Array.isArray(json.data.table.rows)).toBe(true)
  })

  it('✗ 400: missing organizationId', async () => {
    const res = await handleReportsAnalytics('http://localhost/api/reports/analytics?month=2026-04')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('✗ 400: missing month', async () => {
    const res = await handleReportsAnalytics('http://localhost/api/reports/analytics?organizationId=org_demo')
    expect(res.status).toBe(400)
  })
})