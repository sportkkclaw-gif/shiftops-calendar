/**
 * Calendar API Tests — Google Calendar fallback, ICS, last-known schedule, PWA
 * Server lifecycle is managed by tests/api/setup.ts (shared singleton, setupFilesAfterEnv).
 * No additional bootstrap needed here.
 */

import { describe, expect, test } from '@jest/globals'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const PORT = process.env.E2E_PORT ?? '3000'

describe('Calendar API — PWA / Offline / Google Calendar Fallback', () => {
  let managerToken = ''

  test('POST /api/auth/login — manager@shiftops.local', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@shiftops.local', password: 'manager2026' }),
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    managerToken = json.data?.token ?? ''
    expect(managerToken).toBeDefined()
  })

  test('GET /api/calendar/google-fallback — returns fallback source (no GOOGLE_CALENDAR_ID set)', async () => {
    const res = await fetch(`${BASE}/api/calendar/google-fallback?locationId=loc_demo&start=2026-05-01&end=2026-05-31`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(['google_calendar_fallback', 'google_calendar']).toContain(json.data?.source)
    expect(json.data?.configured).toBe(false)
    expect(json.data?.icsDownloadUrl).toContain('/api/calendar/ics')
    expect(typeof json.data?.events).toBe('object')
  })

  test('GET /api/calendar/ics — returns valid ICS file', async () => {
    const res = await fetch(`${BASE}/api/calendar/ics?locationId=loc_demo&start=2026-05-01&end=2026-05-31`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(res.ok).toBe(true)
    const text = await res.text()
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('END:VCALENDAR')
    expect(text).toContain('VERSION:2.0')
    expect(res.headers.get('Content-Type')).toContain('text/calendar')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
  })

  test('POST /api/calendar/last-known — stores last known schedule', async () => {
    const res = await fetch(`${BASE}/api/calendar/last-known`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        locationId: 'loc_demo',
        events: [
          { id: 'test1', date: '2026-05-01', staffName: '王小明', shiftCode: 'A', shiftName: '早班', color: '#3B82F6', assignmentType: 'REGULAR' },
          { id: 'test2', date: '2026-05-02', staffName: '李小華', shiftCode: 'B', shiftName: '午班', color: '#10B981', assignmentType: 'REGULAR' },
        ],
      }),
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json.data?.stored).toBe(true)
    expect(json.data?.count).toBe(2)
  })

  test('GET /api/calendar/last-known — retrieves last known schedule', async () => {
    const res = await fetch(`${BASE}/api/calendar/last-known?locationId=loc_demo`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json.data?.locationId).toBe('loc_demo')
    expect(Array.isArray(json.data?.events)).toBe(true)
  })
})

describe('Multi-Policy Parallel Scheduling API', () => {
  let managerToken = ''

  test('POST /api/auth/login', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@shiftops.local', password: 'manager2026' }),
    })
    const json = await res.json()
    managerToken = json.data?.token ?? ''
  })

  test('POST /api/schedule/multi-policy — three parallel policies without overwrite', async () => {
    const res = await fetch(`${BASE}/api/schedule/multi-policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        organizationId: 'org_demo',
        locationId: 'loc_demo',
        dateRange: { start: '2026-05-01', end: '2026-05-07' },
        policies: [
          {
            name: 'A組-2-2-3',
            patternType: '2-2-3',
            scopeStaffIds: ['staff_1', 'staff_2'],
            patternConfig: {},
            constraints: {},
          },
          {
            name: 'B組-固定早班',
            patternType: 'fixed_shift',
            scopeStaffIds: ['staff_3'],
            patternConfig: {},
            constraints: {},
          },
          {
            name: 'C組-待命',
            patternType: 'on_call',
            scopeStaffIds: ['staff_4', 'staff_5'],
            patternConfig: {},
            constraints: {},
          },
        ],
      }),
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json.data?.policies).toHaveLength(3)
    expect(json.data?.policies[0]?.policyName).toBe('A組-2-2-3')
    expect(json.data?.policies[1]?.policyName).toBe('B組-固定早班')
    expect(json.data?.policies[2]?.policyName).toBe('C組-待命')
    expect(json.data?.calendarProjection?.length).toBeGreaterThan(0)
    expect(json.data?.policies[0]?.totalAssignments).toBeGreaterThan(0)
    expect(json.data?.policies[1]?.totalAssignments).toBeGreaterThan(0)
  })

  test('POST /api/schedule/multi-policy — scopes isolated per policy', async () => {
    const res = await fetch(`${BASE}/api/schedule/multi-policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        organizationId: 'org_demo',
        locationId: 'loc_demo',
        dateRange: { start: '2026-05-01', end: '2026-05-03' },
        policies: [
          { name: '組1', patternType: 'ab_rotation', scopeStaffIds: ['staff_1'], patternConfig: {} },
          { name: '組2', patternType: 'ab_rotation', scopeStaffIds: ['staff_2'], patternConfig: {} },
        ],
      }),
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    const policies = json.data?.policies ?? []
    const group1 = policies.find((p: { policyName: string }) => p.policyName === '組1')
    const group2 = policies.find((p: { policyName: string }) => p.policyName === '組2')
    expect(group1).toBeDefined()
    expect(group2).toBeDefined()
    expect(group1.totalAssignments).toBe(group2.totalAssignments)
  })
})