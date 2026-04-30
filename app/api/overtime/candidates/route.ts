/**
 * Overtime Candidates Route
 * GET /api/overtime/candidates
 *
 * Returns list of overtime candidates with reason/risk info.
 * Accepts date/location params (sensible defaults if absent).
 * Requires authenticated user with overtime:read permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

const QuerySchema = {
  parse(params: Record<string, string | undefined>) {
    const organizationId = params.organizationId
    const locationId = params.locationId
    const date = params.date ?? params.startDate ?? params.start
    const endDate = params.endDate ?? params.end
    const status = params.status

    if (!organizationId) {
      return { success: false as const, error: 'organizationId is required' }
    }
    return {
      success: true as const,
      data: {
        organizationId,
        locationId: locationId || undefined,
        date: date || undefined,
        endDate: endDate || undefined,
        status: status || undefined,
      }
    }
  }
}

// ─── GET /api/overtime/candidates ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'overtime:read')
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

    const { organizationId, locationId, date, endDate, status } = parsed.data

    // Build date filter
    const dateFilter: Record<string, unknown> = {}
    if (date) {
      const d = new Date(date)
      if (!isNaN(d.getTime())) dateFilter.gte = d
    }
    if (endDate) {
      const e = new Date(endDate)
      if (!isNaN(e.getTime())) dateFilter.lte = e
    }

    // Build where clause
    const where: Record<string, unknown> = { organizationId }
    if (locationId) where.locationId = locationId
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter
    if (status) where.status = status

    const candidates = await prisma.overtimeCandidate.findMany({
      where,
      orderBy: [
        { score: 'desc' },
        { date: 'asc' },
      ],
    })

    const formatted = candidates.map(c => ({
      id: c.id,
      organizationId: c.organizationId,
      locationId: c.locationId,
      date: c.date.toISOString().split('T')[0],
      staffId: c.staffId,
      staffName: c.staffId,
      targetShiftTypeId: c.targetShiftTypeId,
      targetShiftTypeName: c.targetShiftTypeId,
      sourceShiftTypeId: c.sourceShiftTypeId,
      sourceShiftTypeName: c.sourceShiftTypeId ?? null,
      reason: c.reason,
      riskFlags: c.riskFlags ? c.riskFlags.split(',').map(f => f.trim()).filter(Boolean) : [],
      score: c.score,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    }))

    return NextResponse.json({
      data: {
        candidates: formatted,
        total: formatted.length,
        filters: { organizationId, locationId: locationId ?? null, date: date ?? null, endDate: endDate ?? null, status: status ?? 'all' },
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/overtime/candidates]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}