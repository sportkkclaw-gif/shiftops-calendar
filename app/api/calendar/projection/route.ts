/**
 * Calendar Projection Route
 * GET /api/calendar/projection
 *
 * Returns per-day calendar projection for a month + location.
 * Uses existing ShiftRule + ShiftAssignment + CalendarDayProjection data
 * to compute which shift type should be scheduled per day per rule.
 *
 * Params: month (YYYY-MM), organizationId, locationId
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import { previewProjection, shouldUsePreviewFallback } from '@/lib/preview-fallback'

const QuerySchema = {
  parse(params: Record<string, string | undefined>) {
    const organizationId = params.organizationId
    const locationId = params.locationId
    const month = params.month ?? params.startDate ?? params.start

    if (!organizationId) return { success: false as const, error: 'organizationId is required' }
    if (!month) return { success: false as const, error: 'month is required (YYYY-MM format)' }

    // Validate month format YYYY-MM
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return { success: false as const, error: 'month must be YYYY-MM' }
    }

    return {
      success: true as const,
      data: { organizationId, locationId: locationId || undefined, month }
    }
  }
}

function buildMonthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split('-').map(Number)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m - 1 + 1, 0) // last day of month
  return { start, end }
}

function cycleDay(date: Date, anchorDate: Date, cycleDays: number): number {
  const msPerDay = 86400000
  const diff = Math.floor((date.getTime() - anchorDate.getTime()) / msPerDay)
  return ((diff % cycleDays) + cycleDays) % cycleDays + 1
}

function phaseLabel(patternType: string, patternConfig: Record<string, unknown>, dayIndex: number): { shiftCode: string; label: string; shiftTypeId: string } {
  if (patternType === 'n_on_m_off') {
    const n = (patternConfig.n as number) || 3
    const m = (patternConfig.m as number) || 1
    const cycleLen = n + m
    const pos = dayIndex % cycleLen
    if (pos < n) return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
    return { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' }
  }

  if (patternType === 'ab_rotation') {
    return dayIndex % 2 === 0
      ? { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
      : { shiftCode: 'B', label: '午班', shiftTypeId: 'st_afternoon' }
  }

  if (patternType === 'named_pattern' || patternType === 'fixed_rotation') {
    // 2-2-3 style sequence: [A, A, B, B, OFF, OFF, OFF]
    const seq: Array<{ shiftCode: string; label: string; shiftTypeId: string }> = [
      { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' },
      { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' },
      { shiftCode: 'B', label: '午班', shiftTypeId: 'st_afternoon' },
      { shiftCode: 'B', label: '午班', shiftTypeId: 'st_afternoon' },
      { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' },
      { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' },
      { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' },
    ]
    return seq[dayIndex % seq.length]
  }

  if (patternType === 'on_call') {
    return { shiftCode: 'OC', label: '待命', shiftTypeId: 'st_oncall' }
  }

  if (patternType === 'dupont') {
    const seq = [0, 0, 1, 1, 2, 2, 2] // A,A,B,B,N,OFF,OFF
    const pos = seq[dayIndex % seq.length]
    if (pos === 0) return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
    if (pos === 1) return { shiftCode: 'B', label: '午班', shiftTypeId: 'st_afternoon' }
    return { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' }
  }

  if (patternType === 'pitman') {
    const seq = [0, 0, 0, 1, 1, 1, 2] // A,A,A,B,B,B,OFF
    const pos = seq[dayIndex % seq.length]
    if (pos === 0) return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
    if (pos === 1) return { shiftCode: 'B', label: '午班', shiftTypeId: 'st_afternoon' }
    return { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' }
  }

  return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'assignment:read')
  if (auth.error) return auth.error

  try {
    const searchParams = new URL(req.url).searchParams
    const params = Object.fromEntries(searchParams.entries())
    const parsed = QuerySchema.parse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error } },
        { status: 400 }
      )
    }

    const { organizationId, locationId, month } = parsed.data
    const { start, end } = buildMonthRange(month)

    // Build location filter
    const locWhere: Record<string, unknown> = { organizationId }
    if (locationId) locWhere.id = locationId

    const locations = await prisma.location.findMany({ where: locWhere, select: { id: true, name: true } })
    if (!locations.length) {
      return NextResponse.json({ data: { projections: [], month, totalDays: 0 }, meta: { requestId: `req_${Date.now()}` } })
    }

    // Fetch rules for this org/location
    const ruleWhere: Record<string, unknown> = { organizationId, active: true }
    if (locationId) ruleWhere.locationId = locationId
    const rules = await prisma.shiftRule.findMany({
      where: ruleWhere,
      select: { id: true, name: true, patternType: true, patternName: true, patternConfig: true, scopeFilter: true, priority: true },
    })

    // Fetch existing assignments in range
    const assignWhere: Record<string, unknown> = { organizationId, date: { gte: start, lte: end } }
    if (locationId) assignWhere.locationId = locationId
    const assignments = await prisma.shiftAssignment.findMany({ where: assignWhere })

    // Fetch shift types
    const shiftTypes = await prisma.shiftType.findMany({ where: { organizationId } })
    const shiftTypeMap: Record<string, { name: string; color: string }> = {}
    for (const st of shiftTypes) { shiftTypeMap[st.id] = { name: st.name, color: st.color } }

    // Fetch coverage requirements
    const covReqs = await prisma.coverageRequirement.findMany({
      where: { organizationId, locationId: locationId || undefined },
    })

    const staffMap = new Map<string, { name: string }>()

    // Fetch existing CalendarDayProjections
    const projWhere: Record<string, unknown> = { organizationId, date: { gte: start, lte: end } }
    if (locationId) projWhere.locationId = locationId
    const existingProjections = await prisma.calendarDayProjection.findMany({ where: projWhere })
    const projMap: Record<string, typeof existingProjections[0]> = {}
    for (const p of existingProjections) { projMap[`${p.locationId}_${p.date.toISOString().slice(0, 10)}`] = p }

    // D38: fetch persisted coverage alerts once, then fan-out by day/location
    const alertWhere: Record<string, unknown> = { organizationId, date: { gte: start, lte: end } }
    if (locationId) alertWhere.locationId = locationId
    const coverageAlerts = (await prisma.coverageAlert.findMany({ where: alertWhere })) ?? []

    // Build per-location, per-day projections
    const projectionDays: Array<Record<string, unknown>> = []
    const numDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    const anchorDate = new Date(start)

    for (const loc of locations) {
      for (let d = 0; d < numDays; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + d)
        const dateStr = date.toISOString().slice(0, 10)
        const dayOfWeek = date.getDay()

        const locAssignments = assignments.filter(
          a => a.locationId === loc.id && a.date.toISOString().slice(0, 10) === dateStr
        )

        // Rule projections for this day
        const ruleProjections = rules
          .filter(r => {
            const scope = JSON.parse((r.scopeFilter as string) || '{}')
            return !scope.locationId || scope.locationId === loc.id
          })
          .map(rule => {
            const config = JSON.parse((rule.patternConfig as string) || '{}')
            const seqIndex = cycleDay(date, anchorDate, config.cycleDays ?? 7) - 1
            const phase = phaseLabel(rule.patternType, config, seqIndex)
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              patternType: rule.patternType,
              patternName: rule.patternName,
              cycleDay: seqIndex + 1,
              phaseLabel: phase.shiftCode,
              phaseDescription: phase.label,
              expectedShiftTypeId: phase.shiftTypeId,
              expectedShiftTypeName: shiftTypeMap[phase.shiftTypeId]?.name ?? phase.shiftTypeId,
            }
          })

        // Coverage status
        const covReq = covReqs.filter(c => c.locationId === loc.id && (c.weekday === dayOfWeek || !c.weekday))
        const assignedCount = locAssignments.length
        const requiredMin = covReq.reduce((s, c) => s + c.minCount, 0)
        const coverageStatus = assignedCount >= requiredMin ? 'adequate' : assignedCount > 0 ? 'partial' : 'low'

        // Overtime info
        const otAssignments = locAssignments.filter(a => a.assignmentType === 'OVERTIME')
        const otCandidates = otAssignments.length > 0
          ? otAssignments.map(a => ({
              staffId: a.staffId,
              staffName: staffMap.get(a.staffId)?.name ?? a.staffId,
              shiftTypeId: a.shiftTypeId,
            }))
          : []

        // Visual tokens (max 3 per compact mode)
        const tokens = ruleProjections.slice(0, 3).map(rp => ({
          code: rp.phaseLabel,
          label: rp.phaseDescription,
          ruleName: rp.ruleName,
        }))
        const hiddenCount = Math.max(0, ruleProjections.length - 3)

        const key = `${loc.id}_${dateStr}`
        const existingProj = projMap[key]
        const locAlerts = coverageAlerts.filter(
          a => a.locationId === loc.id && a.date.toISOString().slice(0, 10) === dateStr
        )

        projectionDays.push({
          date: dateStr,
          weekday: dayOfWeek,
          locationId: loc.id,
          locationName: loc.name,
          ruleProjections,
          tokens,
          hiddenCount,
          assignmentCount: locAssignments.length,
          assignments: locAssignments.map(a => ({
            id: a.id,
            staffId: a.staffId,
            staffName: staffMap.get(a.staffId)?.name ?? a.staffId,
            shiftTypeId: a.shiftTypeId,
            shiftTypeName: shiftTypeMap[a.shiftTypeId]?.name ?? a.shiftTypeId,
            assignmentType: a.assignmentType,
            status: a.status,
          })),
          coverageStatus,
          coverageRequirement: requiredMin,
          coverageAssigned: assignedCount,
          overtimeAssignments: otCandidates,
          // D38: coverageAlerts from DB — source of truth for hasCoverageAlert
          // Fetch alerts for this date+location from prisma.coverageAlert
          coverageAlerts: locAlerts.map(a => ({
            id: a.id,
            severity: a.severity,
            status: a.status,
            message: a.message,
            details: JSON.parse(a.details || '{}'),
          })),
          displayState: {
            mode: 'compact',
            hiddenCount: hiddenCount > 0 ? hiddenCount : undefined,
          },
        })
      }
    }

    return NextResponse.json({
      data: {
        month,
        dateRange: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
        organizationId,
        locationId: locationId ?? null,
        locations: locations.map(l => l.name),
        totalDays: numDays,
        projections: projectionDays,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/calendar/projection]', err)
    if (shouldUsePreviewFallback()) {
      const searchParams = new URL(req.url).searchParams
      const month = searchParams.get('month') ?? searchParams.get('startDate') ?? searchParams.get('start') ?? '2026-05'
      const organizationId = searchParams.get('organizationId') ?? 'org_demo'
      const locationId = searchParams.get('locationId') ?? 'loc_demo'
      return NextResponse.json({ data: previewProjection(month, organizationId, locationId), meta: { requestId: `req_${Date.now()}`, previewFallback: true } })
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}