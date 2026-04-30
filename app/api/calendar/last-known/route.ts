/**
 * Last Known Schedule API — stores and retrieves the last cached schedule for offline use.
 * POST /api/calendar/last-known   — cache current schedule
 * GET  /api/calendar/last-known   — retrieve cached schedule (offline fallback)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// In-memory cache for last-known schedule (per location)
// In production, this would use Redis or DB with TTL
const lastKnownCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId') ?? 'loc_demo'

    const cached = lastKnownCache.get(locationId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        data: { ...(cached.data as object), _cachedAt: new Date(cached.timestamp).toISOString(), _offline: true },
      })
    }

    // Rebuild from DB
    const end = new Date()
    const start = new Date(end.getTime() - 30 * 86400000)

    const assignments = await prisma.shiftAssignment.findMany({
      where: { locationId, date: { gte: start, lte: end } },
    })

    const staffMap = new Map<string, string>()
    const staffProfiles = await prisma.staffProfile.findMany({ where: { locationId } })
    for (const sp of staffProfiles) staffMap.set(sp.id, sp.name)

    const shiftTypeMap = new Map<string, { name: string; code: string; color: string }>()
    const shiftTypes = await prisma.shiftType.findMany({ where: { locationId } })
    for (const st of shiftTypes) shiftTypeMap.set(st.id, { name: st.name, code: st.code, color: st.color })

    const events = assignments.map(a => {
      const st = shiftTypeMap.get(a.shiftTypeId)
      return {
        id: a.id,
        date: new Date(a.date).toISOString().slice(0, 10),
        staffName: staffMap.get(a.staffId) ?? a.staffId,
        shiftCode: st?.code ?? '?',
        shiftName: st?.name ?? '未知',
        color: st?.color ?? '#6B7280',
        assignmentType: a.assignmentType,
      }
    })

    return NextResponse.json({
      data: {
        source: 'last_known',
        locationId,
        events,
        generatedAt: new Date().toISOString(),
        _offline: false,
      },
    })
  } catch (err) {
    console.error('[GET /api/calendar/last-known]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { locationId = 'loc_demo', events = [] } = body

    lastKnownCache.set(locationId, {
      data: { locationId, events },
      timestamp: Date.now(),
    })

    return NextResponse.json({ data: { stored: true, locationId, count: Array.isArray(events) ? events.length : 0 } })
  } catch (err) {
    console.error('[POST /api/calendar/last-known]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
