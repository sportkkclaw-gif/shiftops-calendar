/**
 * AI Coverage Summary Route
 * GET /api/ai/coverage-summary
 *
 * Returns an AI-friendly coverage summary for a month + location,
 * suitable for AI assistant to answer "本月缺口在哪" or similar questions.
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
  const auth = await requireAuth(req, 'ai:preview')
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

    // Location filter
    const locWhere: Record<string, unknown> = { organizationId }
    if (locationId) locWhere.id = locationId
    const locations = await prisma.location.findMany({ where: locWhere, select: { id: true, name: true } })

    // Coverage requirements
    const covReqWhere: Record<string, unknown> = { organizationId }
    if (locationId) covReqWhere.locationId = locationId
    const requirements = await prisma.coverageRequirement.findMany({ where: covReqWhere })

    // Shift assignments
    const assignWhere: Record<string, unknown> = { organizationId, date: { gte: start, lte: end } }
    if (locationId) assignWhere.locationId = locationId
    const assignments = await prisma.shiftAssignment.findMany({ where: assignWhere })

    // Coverage alerts
    const alertWhere: Record<string, unknown> = { organizationId, date: { gte: start, lte: end } }
    if (locationId) alertWhere.locationId = locationId
    const alerts = await prisma.coverageAlert.findMany({ where: alertWhere })

    // Overtime candidates
    const otWhere: Record<string, unknown> = { organizationId, date: { gte: start, lte: end } }
    if (locationId) otWhere.locationId = locationId
    const otCandidates = await prisma.overtimeCandidate.findMany({ where: otWhere })

    // Shift types
    const shiftTypes = await prisma.shiftType.findMany({ where: { organizationId } })
    const shiftTypeMap: Record<string, string> = {}
    for (const st of shiftTypes) shiftTypeMap[st.id] = st.name

    const locationSummaries = locations.map(loc => {
      const locAssignments = assignments.filter(a => a.locationId === loc.id)
      const locAlerts = alerts.filter(a => a.locationId === loc.id)
      const locOt = otCandidates.filter(c => c.locationId === loc.id)
      const locReqs = requirements.filter(r => r.locationId === loc.id)

      // Group by date
      const byDate: Record<string, typeof locAssignments> = {}
      for (const a of locAssignments) {
        const d = dateStr(a.date)
        if (!byDate[d]) byDate[d] = []
        byDate[d].push(a)
      }

      // Per shiftType shortfall analysis
      const shiftTypeGaps: Array<Record<string, unknown>> = []
      for (const req of locReqs) {
        const stName = shiftTypeMap[req.shiftTypeId] ?? req.shiftTypeId
        const reqMin = req.minCount
        const daysBelow: string[] = []

        // Walk through each day in month
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayAssignments = byDate[dateStr(d)] ?? []
          const count = dayAssignments.filter(a => a.shiftTypeId === req.shiftTypeId).length
          if (count < reqMin) {
            daysBelow.push(dateStr(new Date(d)))
          }
        }

        if (daysBelow.length > 0) {
          shiftTypeGaps.push({
            shiftTypeId: req.shiftTypeId,
            shiftTypeName: stName,
            requiredMin: reqMin,
            shortfallDays: daysBelow.length,
            shortfallDates: daysBelow.slice(0, 5), // first 5
            shortfallPercentage: Math.round((daysBelow.length / (end.getDate())) * 100),
          })
        }
      }

      // Total coverage rate
      const totalDays = end.getDate()
      const daysWithAssignments = Object.keys(byDate).length
      const coverageRate = Math.round((daysWithAssignments / totalDays) * 100)

      // Alert summary
      const alertSummary = {
        total: locAlerts.length,
        bySeverity: locAlerts.reduce((acc: Record<string, number>, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1
          return acc
        }, {}),
        unresolved: locAlerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'ARCHIVED').length,
      }

      // OT candidate summary
      const otSummary = {
        total: locOt.length,
        byDate: locOt.reduce((acc: Record<string, number>, c) => {
          const d = dateStr(c.date)
          acc[d] = (acc[d] || 0) + 1
          return acc
        }, {}),
        highRisk: locOt.filter(c => {
          const flags = (c.riskFlags || '').split(',').map(f => f.trim()).filter(Boolean)
          return flags.some(f => f.includes('consecutive') || f.includes('rest'))
        }).length,
      }

      return {
        locationId: loc.id,
        locationName: loc.name,
        month,
        coverageRate,
        totalAssignmentDays: daysWithAssignments,
        totalDaysInMonth: totalDays,
        shiftTypeGaps,
        alertSummary,
        otSummary,
        // Natural language narrative for AI consumption
        narrative: locAlerts.length > 0
          ? `本月在 ${loc.name} 共有 ${locAlerts.length} 個覆蓋警示，其中 ${alertSummary.unresolved} 個尚未解除。`
          : `本月在 ${loc.name} 覆蓋情況良好，無警示記錄。`,
      }
    })

    // Overall summary
    const totalAlerts = alerts.length
    const totalOtCandidates = otCandidates.length
    const locationsWithGaps = locationSummaries.filter(l => l.shiftTypeGaps.length > 0).length

    return NextResponse.json({
      data: {
        month,
        organizationId,
        locationId: locationId ?? null,
        totalAlerts,
        totalOvertimeCandidates: totalOtCandidates,
        locationsWithGaps,
        locations: locationSummaries,
        overallNarrative: totalAlerts > 0
          ? `整體而言，組織 ${organizationId} 本月有 ${totalAlerts} 個覆蓋缺口，涉及 ${locationsWithGaps} 個地點。`
          : `整體而言，組織 ${organizationId} 本月覆蓋情況正常。`,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/ai/coverage-summary]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}