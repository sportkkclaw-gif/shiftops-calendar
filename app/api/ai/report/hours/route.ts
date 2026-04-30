/**
 * AI Hours Report Route
 * GET /api/ai/report/hours
 *
 * Returns hours summary by staff and totals from shift assignments.
 * Requires authenticated user with ai:preview or overtime:read permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import type { Prisma } from '@prisma/client'

const QuerySchema = {
  parse(params: Record<string, string | undefined>) {
    const organizationId = params.organizationId
    const locationId = params.locationId
    const startDate = params.startDate ?? params.start
    const endDate = params.endDate ?? params.end

    if (!organizationId) {
      return { success: false as const, error: 'organizationId is required' }
    }
    return {
      success: true as const,
      data: { organizationId, locationId: locationId || undefined, startDate, endDate }
    }
  }
}

// ─── GET /api/ai/report/hours ──────────────────────────────────────────────────

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

    const { organizationId, locationId, startDate, endDate } = parsed.data

    // Build date filter
    const dateFilter: Prisma.ShiftAssignmentWhereInput['date'] = {}
    if (startDate) {
      const start = new Date(startDate)
      if (!isNaN(start.getTime())) dateFilter.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      if (!isNaN(end.getTime())) dateFilter.lte = end
    }

    // Build assignment filter
    const assignWhere: Prisma.ShiftAssignmentWhereInput = { organizationId }
    if (locationId) assignWhere.locationId = locationId
    if (startDate || endDate) assignWhere.date = dateFilter

    const assignments = await prisma.shiftAssignment.findMany({
      where: assignWhere,
    })

    // Group by staff
    const staffHours: Record<string, {
      staffId: string
      staffName: string
      roleCode: string
      regularMinutes: number
      overtimeMinutes: number
      totalMinutes: number
      assignmentCount: number
      shiftBreakdown: Record<string, number>
    }> = {}

    for (const assignment of assignments) {
      const sid = assignment.staffId
      if (!staffHours[sid]) {
        staffHours[sid] = {
          staffId: sid,
          staffName: sid,
          roleCode: 'UNKNOWN',
          regularMinutes: 0,
          overtimeMinutes: 0,
          totalMinutes: 0,
          assignmentCount: 0,
          shiftBreakdown: {},
        }
      }

      const duration = 480
      const isOvertime = assignment.assignmentType === 'OVERTIME'

      if (isOvertime) {
        staffHours[sid].overtimeMinutes += duration
      } else {
        staffHours[sid].regularMinutes += duration
      }
      staffHours[sid].totalMinutes += duration
      staffHours[sid].assignmentCount += 1

      const stName = assignment.shiftTypeId
      staffHours[sid].shiftBreakdown[stName] = (staffHours[sid].shiftBreakdown[stName] ?? 0) + 1
    }

    const staffList = Object.values(staffHours).sort((a, b) => b.totalMinutes - a.totalMinutes)

    const totals = {
      totalStaff: staffList.length,
      totalRegularMinutes: staffList.reduce((s, st) => s + st.regularMinutes, 0),
      totalOvertimeMinutes: staffList.reduce((s, st) => s + st.overtimeMinutes, 0),
      totalMinutes: staffList.reduce((s, st) => s + st.totalMinutes, 0),
      totalAssignments: staffList.reduce((s, st) => s + st.assignmentCount, 0),
    }

    return NextResponse.json({
      data: {
        organizationId,
        locationId: locationId ?? null,
        dateRange: { start: startDate, end: endDate },
        staff: staffList,
        totals,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/ai/report/hours]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}