/**
 * Holiday/Lunar Data Route
 * GET /api/data/holidays
 *
 * Returns holiday and lunar date entries for an organization (optionally filtered by location/year).
 * Publicly accessible (no auth required) per existing data route convention.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const QuerySchema = {
  parse(params: Record<string, string | undefined>) {
    const organizationId = params.organizationId ?? 'org_demo'
    const locationId = params.locationId
    const yearStr = params.year
    const includeLunar = params.includeLunar !== 'false'

    if (!organizationId) {
      return { success: false as const, error: 'organizationId is required' }
    }
    if (yearStr !== undefined) {
      const year = parseInt(yearStr, 10)
      if (isNaN(year) || year < 1900 || year > 2100) {
        return { success: false as const, error: 'Invalid year parameter (must be 1900–2100)' }
      }
      return {
        success: true as const,
        data: { organizationId, locationId: locationId || undefined, year, includeLunar },
      }
    }
    return {
      success: true as const,
      data: { organizationId, locationId: locationId || undefined, year: undefined, includeLunar },
    }
  },
}

// ─── GET /api/data/holidays ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
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

    const { organizationId, locationId, year, includeLunar } = parsed.data

    // Holiday query
    const holidayWhere: Prisma.HolidayWhereInput = { organizationId }
    if (locationId) holidayWhere.locationId = locationId
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`)
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`)
      holidayWhere.date = { gte: startOfYear, lte: endOfYear }
    }

    const holidays = await prisma.holiday.findMany({
      where: holidayWhere,
      orderBy: [{ date: 'asc' }],
    })

    // LunarDate query
    let lunarDates: Awaited<ReturnType<typeof prisma.lunarDate.findMany>> = []
    if (includeLunar) {
      const lunarWhere: Prisma.LunarDateWhereInput = { organizationId }
      if (locationId) lunarWhere.locationId = locationId
      if (year) lunarWhere.lunarYear = year

      lunarDates = await prisma.lunarDate.findMany({
        where: lunarWhere,
        orderBy: [{ lunarYear: 'asc' }, { lunarMonth: 'asc' }, { lunarDay: 'asc' }],
      })
    }

    // 2026-05 coverage check: ensure May 2026 holidays are present
    const may2026Holidays = holidays.filter(h => {
      const d = new Date(h.date)
      return d.getFullYear() === 2026 && d.getMonth() === 4 // May = month 4
    })

    return NextResponse.json({
      data: {
        organizationId,
        locationId: locationId ?? null,
        year: year ?? null,
        holidays,
        lunarDates,
        summary: {
          totalHolidays: holidays.length,
          totalLunarDates: lunarDates.length,
          may2026HolidayCount: may2026Holidays.length,
        },
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/data/holidays]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
