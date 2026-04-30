/**
 * Calendar Day Inspector Route
 * GET /api/calendar/day-inspector
 *
 * Returns detailed view of a single date: assignments, rule projections,
 * coverage alerts, overtime candidates for that day.
 *
 * Params: date (YYYY-MM-DD), organizationId, locationId
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

const QuerySchema = {
  parse(params: Record<string, string | undefined>) {
    const organizationId = params.organizationId
    const locationId = params.locationId
    const date = params.date ?? params.startDate ?? params.start

    if (!organizationId) return { success: false as const, error: 'organizationId is required' }
    if (!date) return { success: false as const, error: 'date is required (YYYY-MM-DD format)' }

    // Validate YYYY-MM-DD
    if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(date)) {
      return { success: false as const, error: 'date must be YYYY-MM-DD' }
    }

    return {
      success: true as const,
      data: { organizationId, locationId: locationId || undefined, date }
    }
  }
}

function buildProjection(date: Date, anchorDate: Date) {
  const msPerDay = 86400000
  const diff = Math.floor((date.getTime() - anchorDate.getTime()) / msPerDay)
  return diff
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

    const { organizationId, locationId, date } = parsed.data
    const targetDate = new Date(date + 'T00:00:00.000Z')

    // Build location filter
    const locWhere: Record<string, unknown> = { organizationId }
    if (locationId) locWhere.id = locationId

    const locations = await prisma.location.findMany({ where: locWhere, select: { id: true, name: true } })
    if (!locations.length) {
      return NextResponse.json({ data: null, meta: { requestId: `req_${Date.now()}` } }, { status: 404 })
    }

    const dayOfWeek = targetDate.getUTCDay()
    const dateStr = date

    // Fetch assignments for this date
    const assignWhere: Record<string, unknown> = {
      organizationId,
      date: targetDate,
    }
    if (locationId) assignWhere.locationId = locationId

    const assignments = await prisma.shiftAssignment.findMany({ where: assignWhere })

    // Fetch rules
    const ruleWhere: Record<string, unknown> = { organizationId, active: true }
    if (locationId) ruleWhere.locationId = locationId
    const rules = await prisma.shiftRule.findMany({
      where: ruleWhere,
      select: { id: true, name: true, patternType: true, patternName: true, patternConfig: true, scopeFilter: true, priority: true },
    })

    // Fetch coverage alerts for this date
    const alertWhere: Record<string, unknown> = { organizationId, date: targetDate }
    if (locationId) alertWhere.locationId = locationId
    const alerts = await prisma.coverageAlert.findMany({ where: alertWhere })

    // Fetch overtime candidates for this date
    const otWhere: Record<string, unknown> = { organizationId, date: targetDate }
    if (locationId) otWhere.locationId = locationId
    const otCandidates = await prisma.overtimeCandidate.findMany({
      where: otWhere,
      orderBy: { score: 'desc' },
    })

    // Fetch coverage requirements
    const covReqs = await prisma.coverageRequirement.findMany({
      where: { organizationId, locationId: locationId || undefined },
    })
    const relevantCovReqs = covReqs.filter(
      c => !c.weekday || c.weekday === dayOfWeek || !c.date || c.date.getTime() === targetDate.getTime()
    )

    const staffMap = new Map<string, { name: string; color: string; roleCode: string }>()
    const shiftTypeIds = [...new Set([
      ...assignments.map(a => a.shiftTypeId),
      ...otCandidates.map(c => c.targetShiftTypeId),
      ...otCandidates.map(c => c.sourceShiftTypeId).filter(Boolean) as string[],
      ...alerts.map(a => a.shiftTypeId),
    ])]
    const shiftTypes = await prisma.shiftType.findMany({ where: { id: { in: shiftTypeIds } }, select: { id: true, name: true, color: true, startTime: true, endTime: true } })
    const shiftTypeMap = new Map(shiftTypes.map(s => [s.id, s]))

    // Build per-location detail
    const details = locations.map(loc => {
      const locAssignments = assignments.filter(a => a.locationId === loc.id)
      const locAlerts = alerts.filter(a => a.locationId === loc.id)
      const locOtCandidates = otCandidates.filter(c => c.locationId === loc.id)

      // Rule projections
      const anchorDate = new Date(2026, 0, 1) // Jan 1 2026 anchor for cycle calculation
      const dayOffset = buildProjection(targetDate, anchorDate)

      const ruleProjections = rules
        .filter(r => {
          const scope = JSON.parse((r.scopeFilter as string) || '{}')
          return !scope.locationId || scope.locationId === loc.id
        })
        .map(rule => {
          const config = JSON.parse((rule.patternConfig as string) || '{}')
          const cycleDays = config.cycleDays ?? 7
          const cyclePos = ((dayOffset % cycleDays) + cycleDays) % cycleDays

          let shiftCode = 'A', label = '早班', shiftTypeId = 'st_morning'
          if (rule.patternType === 'n_on_m_off') {
            const n = config.n as number || 3, m = config.m as number || 1
            if (cyclePos < n) { shiftCode = 'A'; label = '早班'; shiftTypeId = 'st_morning' }
            else { shiftCode = 'OFF'; label = '休息'; shiftTypeId = 'st_off' }
          } else if (rule.patternType === 'ab_rotation') {
            if (cyclePos % 2 === 0) { shiftCode = 'A'; label = '早班'; shiftTypeId = 'st_morning' }
            else { shiftCode = 'B'; label = '午班'; shiftTypeId = 'st_afternoon' }
          } else if (rule.patternType === 'on_call') {
            shiftCode = 'OC'; label = '待命'; shiftTypeId = 'st_oncall'
          } else {
            // named pattern / fixed: use 2-2-3 sequence
            const seq = [0, 0, 1, 1, 2, 2, 2]
            const pos = seq[cyclePos % seq.length]
            if (pos === 0) { shiftCode = 'A'; label = '早班'; shiftTypeId = 'st_morning' }
            else if (pos === 1) { shiftCode = 'B'; label = '午班'; shiftTypeId = 'st_afternoon' }
            else { shiftCode = 'OFF'; label = '休息'; shiftTypeId = 'st_off' }
          }

          return {
            ruleId: rule.id,
            ruleName: rule.name,
            patternType: rule.patternType,
            patternName: rule.patternName,
            cycleDay: cyclePos + 1,
            cycleDays,
            phaseLabel: shiftCode,
            phaseDescription: label,
            expectedShiftTypeId: shiftTypeId,
          }
        })

      // Coverage status
      const requiredMin = relevantCovReqs.filter(c => c.locationId === loc.id).reduce((s, c) => s + c.minCount, 0)
      const assigned = locAssignments.length
      const coverageStatus = assigned >= requiredMin ? 'adequate' : assigned > 0 ? 'partial' : 'low'

      // Overtime warnings from candidates
      const otWarnings = locOtCandidates
        .filter(c => c.riskFlags)
        .flatMap(c => c.riskFlags.split(',').map(f => f.trim()).filter(Boolean))
        .filter((v, i, a) => a.indexOf(v) === i) // unique

      return {
        locationId: loc.id,
        locationName: loc.name,
        date: dateStr,
        weekday: dayOfWeek,
        ruleProjections,
        assignments: locAssignments.map(a => {
          const sp = staffMap.get(a.staffId)
          const st = shiftTypeMap.get(a.shiftTypeId)
          return {
            id: a.id,
            staffId: a.staffId,
            staffName: sp?.name ?? a.staffId,
            staffColor: sp?.color ?? '#888',
            staffRoleCode: sp?.roleCode ?? 'REGULAR',
            shiftTypeId: a.shiftTypeId,
            shiftTypeName: st?.name ?? a.shiftTypeId,
            shiftTypeColor: st?.color ?? '#888',
            shiftStartTime: st?.startTime ?? null,
            shiftEndTime: st?.endTime ?? null,
            assignmentType: a.assignmentType,
            status: a.status,
            note: a.note ?? null,
          }
        }),
        coverage: {
          status: coverageStatus,
          required: requiredMin,
          assigned,
          shortfall: Math.max(0, requiredMin - assigned),
        },
        coverageAlerts: locAlerts.map(a => ({
          id: a.id,
          severity: a.severity,
          status: a.status,
          message: a.message,
          details: JSON.parse(a.details || '{}'),
        })),
        overtimeCandidates: locOtCandidates.map(c => {
          const sp = staffMap.get(c.staffId)
          const targetSt = shiftTypeMap.get(c.targetShiftTypeId)
          const sourceSt = c.sourceShiftTypeId ? shiftTypeMap.get(c.sourceShiftTypeId) : null
          return {
            id: c.id,
            staffId: c.staffId,
            staffName: sp?.name ?? c.staffId,
            staffColor: sp?.color ?? '#888',
            targetShiftTypeId: c.targetShiftTypeId,
            targetShiftTypeName: targetSt?.name ?? c.targetShiftTypeId,
            targetShiftTypeColor: targetSt?.color ?? '#888',
            sourceShiftTypeId: c.sourceShiftTypeId,
            sourceShiftTypeName: sourceSt?.name ?? null,
            reason: c.reason,
            riskFlags: c.riskFlags ? c.riskFlags.split(',').map(f => f.trim()).filter(Boolean) : [],
            score: c.score,
            status: c.status,
          }
        }),
        overtimeRiskFlags: otWarnings,
      }
    })

    return NextResponse.json({
      data: {
        date: dateStr,
        weekday: dayOfWeek,
        weekdayName: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][dayOfWeek],
        organizationId,
        locationId: locationId ?? null,
        locations: details,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/calendar/day-inspector]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}