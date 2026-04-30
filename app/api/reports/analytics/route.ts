/**
 * Reports Analytics Route
 * GET /api/reports/analytics
 *
 * Returns table + bar/heatmap-ready aggregates for the reports page.
 * Covers: coverage by day/shiftType, staff hours breakdown,
 * overtime utilization, alert trends.
 *
 * Params: month (YYYY-MM), organizationId, locationId
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

const QuerySchema = {
  parse(params: Record<string, string | undefined>) {
    const organizationId = params.organizationId
    const locationId = params.locationId
    const month = params.month ?? params.startDate ?? params.start

    if (!organizationId) return { success: false as const, error: 'organizationId is required' }
    if (!month) return { success: false as const, error: 'month is required (YYYY-MM format)' }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return { success: false as const, error: 'month must be YYYY-MM' }
    }

    return { success: true as const, data: { organizationId, locationId: locationId || undefined, month } }
  }
}

function buildMonthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split('-').map(Number)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m - 1 + 1, 0)
  return { start, end }
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
    const dateStr = (d: Date) => d.toISOString().slice(0, 10)

    const locWhere: Record<string, unknown> = { organizationId }
    if (locationId) locWhere.id = locationId
    const locations = await prisma.location.findMany({ where: locWhere, select: { id: true, name: true } })

    const assignWhere: Record<string, unknown> = { organizationId, date: { gte: start, lte: end } }
    if (locationId) assignWhere.locationId = locationId
    const assignments = await prisma.shiftAssignment.findMany({ where: assignWhere })

    const shiftTypes = await prisma.shiftType.findMany({ where: { organizationId } })
    const shiftTypeMap: Record<string, { name: string; color: string; durationMinutes: number | null }> = {}
    for (const st of shiftTypes) shiftTypeMap[st.id] = { name: st.name, color: st.color, durationMinutes: st.durationMinutes ?? 480 }

    const staffMap = new Map<string, { name: string; color: string; roleCode: string }>()

    const alerts = await prisma.coverageAlert.findMany({
      where: { organizationId, date: { gte: start, lte: end }, locationId: locationId || undefined },
    })

    const otCandidates = await prisma.overtimeCandidate.findMany({
      where: { organizationId, date: { gte: start, lte: end }, locationId: locationId || undefined },
    })

    // ── 1. Coverage heatmap matrix: [shiftType][weekday] = avg count ─────────────
    const heatmapMatrix: Record<string, number[]> = {}
    for (const st of shiftTypes) {
      heatmapMatrix[st.id] = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
    }

    const shiftTypeDayCounts: Record<string, Record<number, { total: number; days: number }>> = {}
    for (const st of shiftTypes) {
      shiftTypeDayCounts[st.id] = {}
      for (let w = 0; w < 7; w++) shiftTypeDayCounts[st.id][w] = { total: 0, days: 0 }
    }

    for (const a of assignments) {
      const dow = a.date.getDay()
      const stId = a.shiftTypeId
      if (!shiftTypeDayCounts[stId]) shiftTypeDayCounts[stId] = { 0: { total: 0, days: 0 }, 1: { total: 0, days: 0 }, 2: { total: 0, days: 0 }, 3: { total: 0, days: 0 }, 4: { total: 0, days: 0 }, 5: { total: 0, days: 0 }, 6: { total: 0, days: 0 } }
      shiftTypeDayCounts[stId][dow].total += 1
      shiftTypeDayCounts[stId][dow].days += 1
    }

    const heatmap: Array<Record<string, unknown>> = shiftTypes.map(st => {
      const byDow = shiftTypeDayCounts[st.id] ?? {}
      const avgByDow = [0, 1, 2, 3, 4, 5, 6].map(dow => {
        const entry = byDow[dow] ?? { total: 0, days: 0 }
        return entry.days > 0 ? Math.round((entry.total / entry.days) * 10) / 10 : 0
      })
      return { shiftTypeId: st.id, shiftTypeName: st.name, shiftTypeColor: st.color, weekdayAvg: avgByDow }
    })

    // ── 2. Bar chart: staff hours breakdown ─────────────────────────────────────
    const staffHours: Record<string, { staffId: string; name: string; color: string; roleCode: string; regularMinutes: number; overtimeMinutes: number; totalMinutes: number; shiftCount: number }> = {}

    for (const a of assignments) {
      const sid = a.staffId
      if (!staffHours[sid]) {
        staffHours[sid] = { staffId: sid, name: staffMap.get(sid)?.name ?? sid, color: staffMap.get(sid)?.color ?? '#888', roleCode: staffMap.get(sid)?.roleCode ?? 'REGULAR', regularMinutes: 0, overtimeMinutes: 0, totalMinutes: 0, shiftCount: 0 }
      }
      const dur = shiftTypeMap[a.shiftTypeId]?.durationMinutes ?? 480
      if (a.assignmentType === 'OVERTIME') staffHours[sid].overtimeMinutes += dur
      else staffHours[sid].regularMinutes += dur
      staffHours[sid].totalMinutes += dur
      staffHours[sid].shiftCount += 1
    }

    const barChart = Object.values(staffHours)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .map(s => ({
        ...s,
        regularHours: Math.round(s.regularMinutes / 60 * 10) / 10,
        overtimeHours: Math.round(s.overtimeMinutes / 60 * 10) / 10,
        totalHours: Math.round(s.totalMinutes / 60 * 10) / 10,
      }))

    // ── 3. Table: daily coverage by shift type ──────────────────────────────────
    const dailyCoverage: Array<Record<string, unknown>> = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = dateStr(new Date(d))
      const dow = d.getDay()
      const row: Record<string, unknown> = { date: ds, weekday: dow, weekdayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow] }

      for (const st of shiftTypes) {
        const dayAssignments = assignments.filter(a => a.shiftTypeId === st.id && dateStr(a.date) === ds)
        row[st.id] = dayAssignments.length
      }
      row['_total'] = assignments.filter(a => dateStr(a.date) === ds).length

      dailyCoverage.push(row)
    }

    // ── 4. Alert trend by day ────────────────────────────────────────────────────
    const alertTrend: Record<string, { date: string; count: number; bySeverity: Record<string, number> }> = {}
    for (const a of alerts) {
      const ds = dateStr(a.date)
      if (!alertTrend[ds]) alertTrend[ds] = { date: ds, count: 0, bySeverity: {} }
      alertTrend[ds].count += 1
      alertTrend[ds].bySeverity[a.severity] = (alertTrend[ds].bySeverity[a.severity] || 0) + 1
    }

    const alertTrendTable = Object.values(alertTrend).sort((a, b) => a.date.localeCompare(b.date))

    // ── 5. OT utilization summary ───────────────────────────────────────────────
    const otSummary = {
      totalCandidates: otCandidates.length,
      byLocation: locations.map(loc => ({
        locationId: loc.id,
        locationName: loc.name,
        count: otCandidates.filter(c => c.locationId === loc.id).length,
      })),
      highRiskCount: otCandidates.filter(c => {
        const flags = (c.riskFlags || '').split(',').map(f => f.trim()).filter(Boolean)
        return flags.some(f => f.includes('consecutive') || f.includes('rest'))
      }).length,
    }

    return NextResponse.json({
      data: {
        month,
        organizationId,
        locationId: locationId ?? null,
        heatmap,
        barChart,
        table: { columns: ['date', 'weekdayName', ...shiftTypes.map(st => st.id), '_total'], rows: dailyCoverage },
        alertTrend: alertTrendTable,
        otSummary,
        shiftTypes: shiftTypes.map(st => ({ id: st.id, name: st.name, color: st.color })),
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/reports/analytics]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}