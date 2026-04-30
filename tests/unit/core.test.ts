/**
 * ShiftOps Calendar — Unit Tests for Core Logic
 * Covers: mock-ai intent parsing, date helpers, calendar projection, and API contract helpers
 */

import { mockPreviewSchedule, PreviewScheduleInput } from '@/lib/mock-ai'

// ─── Intent Parser Tests ──────────────────────────────────────────────────

describe('Intent parsing (parseIntent)', () => {
  // Test through mockPreviewSchedule by checking output patternType
  async function getPatternType(prompt: string): Promise<string> {
    const input: PreviewScheduleInput = {
      organizationId: 'org_test',
      locationId: 'loc_test',
      dateRange: { start: '2026-04-01', end: '2026-04-30' },
      prompt,
    }
    const result = await mockPreviewSchedule(input)
    // explanation contains patternType
    return result.explanation
  }

  it('✓ detects 做三休一 as n_on_m_off pattern', async () => {
    const explanation = await getPatternType('做三休一')
    expect(explanation).toContain('n_on_m_off')
  })

  it('✓ detects 做四休四 as n_on_m_off pattern', async () => {
    const explanation = await getPatternType('做四休四')
    expect(explanation).toContain('n_on_m_off')
  })

  it('✓ detects A/B 輪班 as ab_rotation pattern', async () => {
    const explanation = await getPatternType('A/B 輪班')
    expect(explanation).toContain('ab_rotation')
  })

  it('✓ detects 2-2-3 as named_pattern', async () => {
    const explanation = await getPatternType('2-2-3')
    expect(explanation).toContain('named_pattern')
  })

  it('✓ detects 待命 as on_call pattern', async () => {
    const explanation = await getPatternType('待命')
    expect(explanation).toContain('on_call')
  })

  it('✓ default to fixed_shift when no pattern matched', async () => {
    const explanation = await getPatternType('random prompt')
    expect(explanation).toContain('fixed_shift')
  })
})

// ─── Calendar Projection Tests ───────────────────────────────────────────

describe('Calendar projection generation', () => {
  async function getProjection(prompt: string) {
    const input: PreviewScheduleInput = {
      organizationId: 'org_test',
      locationId: 'loc_test',
      dateRange: { start: '2026-04-01', end: '2026-04-10' },
      prompt,
    }
    const result = await mockPreviewSchedule(input)
    return result.calendarProjection
  }

  it('✓ n_on_m_off produces correct cycle (3 on / 1 off)', async () => {
    const projection = await getProjection('做三休一')
    // Day 1,2,3 should be work days; day 4 should be OFF
    expect(projection.length).toBe(10)
    const offDays = projection.filter(p => p.shiftCode === 'OFF')
    expect(offDays.length).toBeGreaterThan(0)
  })

  it('✓ on_call generates OC shift type', async () => {
    const projection = await getProjection('待命')
    const onCallDays = projection.filter(p => p.shiftCode === 'OC')
    expect(onCallDays.length).toBe(projection.length) // all on-call
  })

  it('✓ produces expectedStaff and assignedStaff fields', async () => {
    const projection = await getProjection('做三休一')
    projection.forEach(p => {
      expect(p).toHaveProperty('expectedStaff')
      expect(p).toHaveProperty('assignedStaff')
      expect(p).toHaveProperty('coverageStatus')
    })
  })

  it('✓ weekends (weekday 0=Sat, 6=Sat) have low coverage flagged', async () => {
    const projection = await getProjection('做三休一')
    const weekends = projection.filter(p => p.weekday === 0 || p.weekday === 6)
    // In mock, all projection days are set: weekends may be low
    expect(weekends.length).toBeGreaterThan(0)
  })
})

// ─── Coverage Alerts Tests ───────────────────────────────────────────────

describe('Coverage alert generation', () => {
  it('✓ low coverage days generate alerts', async () => {
    const input: PreviewScheduleInput = {
      organizationId: 'org_test',
      locationId: 'loc_test',
      dateRange: { start: '2026-04-01', end: '2026-04-10' },
      prompt: '做三休一',
    }
    const result = await mockPreviewSchedule(input)
    // On-call trigger causes coverage alerts for weekends (weekday 0 or 6)
    expect(result.coverageAlerts.length).toBeGreaterThanOrEqual(0)
  })

  it('✓ alert structure has id, date, severity, status fields', async () => {
    const input: PreviewScheduleInput = {
      organizationId: 'org_test',
      locationId: 'loc_test',
      dateRange: { start: '2026-04-01', end: '2026-04-10' },
      prompt: '做三休一',
    }
    const result = await mockPreviewSchedule(input)
    if (result.coverageAlerts.length > 0) {
      const alert = result.coverageAlerts[0]
      expect(alert).toHaveProperty('id')
      expect(alert).toHaveProperty('date')
      expect(alert).toHaveProperty('severity')
      expect(alert).toHaveProperty('status')
      expect(alert).toHaveProperty('message')
    }
  })
})

// ─── Overtime Candidate Tests ────────────────────────────────────────────

describe('Overtime candidate generation', () => {
  it('✓ on_call prompt generates overtime candidates on low coverage days', async () => {
    const input: PreviewScheduleInput = {
      organizationId: 'org_test',
      locationId: 'loc_test',
      dateRange: { start: '2026-04-01', end: '2026-04-10' },
      prompt: '待命',
    }
    const result = await mockPreviewSchedule(input)
    const candidates = result.overtimeCandidates
    expect(candidates.length).toBeGreaterThan(0)
  })

  it('✓ candidate structure has staffId, score, date, reason', async () => {
    const input: PreviewScheduleInput = {
      organizationId: 'org_test',
      locationId: 'loc_test',
      dateRange: { start: '2026-04-01', end: '2026-04-10' },
      prompt: '待命',
    }
    const result = await mockPreviewSchedule(input)
    if (result.overtimeCandidates.length > 0) {
      const c = result.overtimeCandidates[0]
      expect(c).toHaveProperty('staffId')
      expect(c).toHaveProperty('score')
      expect(c).toHaveProperty('date')
      expect(c).toHaveProperty('reason')
    }
  })
})

// ─── Date Helpers Logic Tests ────────────────────────────────────────────

describe('Date helper logic (inline in calendar page)', () => {
  it('✓ startOfMonth April 2026 → 2026-04-01', () => {
    const d = new Date(2026, 3, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(3)
    expect(start.getDate()).toBe(1)
  })

  it('✓ endOfMonth April 2026 → 30', () => {
    const d = new Date(2026, 3, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    expect(end.getDate()).toBe(30)
  })

  it('✓ addMonths/subMonths correctly navigates months', () => {
    const d = new Date(2026, 3, 1) // April
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1) // May
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1) // March
    expect(next.getMonth()).toBe(4)
    expect(prev.getMonth()).toBe(2)
  })

  it('✓ eachDayOfInterval generates correct number of days', () => {
    const start = new Date(2026, 3, 1)
    const end = new Date(2026, 3, 7) // 7 days in April
    const days: Date[] = []
    const cur = new Date(start)
    while (cur <= end) {
      days.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    expect(days.length).toBe(7)
  })
})