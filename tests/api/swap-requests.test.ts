/**
 * SwapRequest API Tests — server lifecycle managed by tests/api/setup.ts
 */

import { describe, expect, test } from '@jest/globals'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const PORT = process.env.E2E_PORT ?? '3000'

describe('SwapRequest API', () => {
  let managerToken = ''
  let memberToken = ''

  test('POST /api/auth/login — manager@shiftops.local', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@shiftops.local', password: 'manager2026' }),
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json.data?.token).toBeDefined()
    managerToken = json.data.token
  })

  test('POST /api/auth/login — member@test.com', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@test.com', password: 'test1234' }),
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    memberToken = json.data?.token ?? ''
  })

  test('POST /api/swap-requests — member creates swap request with AI suggestions', async () => {
    const res = await fetch(`${BASE}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        organizationId: 'org_demo',
        requesterId: 'staff_1',
        requesterName: '王小明',
        targetDate: '2026-05-06',
        targetShiftTypeId: 'st_morning',
        desiredPartnerId: 'staff_2',
        desiredPartnerName: '李小華',
      }),
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json.data?.id).toBeDefined()
    expect(['pending', 'ai_suggested']).toContain(json.data?.status)
    expect(json.data?.aiSuggestions).toBeDefined()
  })

  test('GET /api/swap-requests — manager lists all', async () => {
    const res = await fetch(`${BASE}/api/swap-requests?organizationId=org_demo`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('PATCH /api/swap-requests/[id]/approve — manager approves', async () => {
    const createRes = await fetch(`${BASE}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        organizationId: 'org_demo',
        requesterId: 'staff_2',
        requesterName: '李小華',
        targetDate: '2026-05-09',
        targetShiftTypeId: 'st_afternoon',
      }),
    })
    const createJson = await createRes.json()
    const swapId = createJson.data?.id

    const approveRes = await fetch(`${BASE}/api/swap-requests/${swapId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ status: 'approved', comment: 'OK' }),
    })
    expect(approveRes.ok).toBe(true)
    const approveJson = await approveRes.json()
    expect(approveJson.data?.status).toBe('approved')
    expect(approveJson.data?.approvedAt).toBeDefined()
  })

  test('PATCH /api/swap-requests/[id]/approve — member cannot approve (403)', async () => {
    const createRes = await fetch(`${BASE}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        organizationId: 'org_demo',
        requesterId: 'staff_1',
        requesterName: '王小明',
        targetDate: '2026-05-15',
        targetShiftTypeId: 'st_morning',
      }),
    })
    const createJson = await createRes.json()
    const swapId = createJson.data?.id

    const approveRes = await fetch(`${BASE}/api/swap-requests/${swapId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    })
    expect(approveRes.status).toBe(403)
  })
})