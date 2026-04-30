/**
 * Multi-Policy Schedule API — handles same-organization parallel scheduling
 * with distinct policy profiles that do not overwrite each other.
 *
 * Each policy profile applies to a specific staff group (scopeFilter).
 * The calendar projection merges all policies by date, respecting scope.
 *
 * POST /api/schedule/multi-policy — generate parallel schedule for multiple policies
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'

const MultiPolicySchema = z.object({
  organizationId: z.string(),
  locationId: z.string(),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  policies: z.array(z.object({
    name: z.string(),
    patternType: z.string(),
    scopeStaffIds: z.array(z.string()),
    patternConfig: z.record(z.unknown()).optional(),
    constraints: z.record(z.unknown()).optional(),
  })),
})

function buildPolicyProjection(
  patternType: string,
  scopeStaffIds: string[],
  dateRange: { start: string; end: string },
  patternConfig: Record<string, unknown> = {}
) {
  const projections = []
  const start = new Date(dateRange.start)
  const end = new Date(dateRange.end)
  let day = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    day++
    let shiftCode = 'OFF'
    let shiftTypeId = 'st_off'
    let label = '休息'

    if (patternType === 'n_on_m_off') {
      const n = (patternConfig.n as number) || 3
      const m = (patternConfig.m as number) || 1
      const cycleLen = n + m
      const pos = ((day - 1) % cycleLen)
      if (pos < n) {
        shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班'
      } else {
        shiftCode = 'OFF'; shiftTypeId = 'st_off'; label = '休息'
      }
    } else if (patternType === 'ab_rotation') {
      if (day % 2 === 1) { shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班' }
      else { shiftCode = 'B'; shiftTypeId = 'st_afternoon'; label = '午班' }
    } else if (patternType === 'fixed_shift') {
      shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班'
    } else if (patternType === 'on_call') {
      shiftCode = 'OC'; shiftTypeId = 'st_oncall'; label = '待命'
    } else if (patternType === 'dupont' || patternType === 'pitman' || patternType === '2-2-3') {
      const seq = [0, 0, 1, 1, 2, 2, 2] // A,A,B,B,OFF,OFF,OFF
      const pos = seq[(day - 1) % seq.length]
      if (pos === 0) { shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班' }
      else if (pos === 1) { shiftCode = 'B'; shiftTypeId = 'st_afternoon'; label = '午班' }
      else { shiftCode = 'OFF'; shiftTypeId = 'st_off'; label = '休息' }
    }

    const staffAssignments = scopeStaffIds.slice(0, shiftCode === 'OFF' ? 0 : Math.min(scopeStaffIds.length, 2)).map(staffId => ({
      staffId,
      date: new Date(d).toISOString().slice(0, 10),
      shiftTypeId,
      assignmentType: 'REGULAR',
    }))

    projections.push({
      date: new Date(d).toISOString().slice(0, 10),
      weekday: d.getDay(),
      policyName: '',
      shiftCode,
      shiftTypeId,
      label,
      staffAssignments,
      expectedStaff: shiftCode === 'OFF' ? 0 : scopeStaffIds.length,
      assignedStaff: staffAssignments.length,
      coverageStatus: staffAssignments.length >= scopeStaffIds.length ? 'adequate' : 'low',
    })
  }
  return projections
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticate(req)
    if (error) return error

    const body = await req.json()
    const parsed = MultiPolicySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { policies, dateRange } = parsed.data

    // Build projections for each policy
    const policyProjections = policies.map(policy => {
      const projections = buildPolicyProjection(
        policy.patternType,
        policy.scopeStaffIds,
        dateRange,
        policy.patternConfig
      )
      // Tag with policy name
      return {
        policyName: policy.name,
        patternType: policy.patternType,
        scopeStaffIds: policy.scopeStaffIds,
        projections,
      }
    })

    // Merge projections by date — each policy's assignments coexist (no overwrite)
    // Key by date, value is array of {policyName, shiftCode, staffAssignments}
    const mergedByDate = new Map<string, unknown[]>()
    for (const pp of policyProjections) {
      for (const proj of pp.projections) {
        const existing = mergedByDate.get(proj.date) ?? []
        existing.push({
          policyName: pp.policyName,
          patternType: pp.patternType,
          shiftCode: proj.shiftCode,
          label: proj.label,
          staffAssignments: proj.staffAssignments,
          coverageStatus: proj.coverageStatus,
        })
        mergedByDate.set(proj.date, existing)
      }
    }

    const mergedCalendar = Array.from(mergedByDate.entries()).map(([date, entries]) => ({
      date,
      policies: entries,
      hasConflict: entries.filter(e => (e as { shiftCode: string }).shiftCode !== 'OFF').length > 1,
    })).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      data: {
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        dateRange,
        policies: policyProjections.map(p => ({
          policyName: p.policyName,
          patternType: p.patternType,
          scopeStaffIds: p.scopeStaffIds,
          totalAssignments: p.projections.flatMap((proj: unknown) => (proj as { staffAssignments: unknown[] }).staffAssignments).length,
        })),
        calendarProjection: mergedCalendar,
        totalEvents: mergedCalendar.length,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[POST /api/schedule/multi-policy]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
