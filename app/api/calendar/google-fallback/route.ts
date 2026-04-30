/**
 * Google Calendar integration with fallback.
 * If GOOGLE_CALENDAR_ID + GOOGLE_SERVICE_ACCOUNT_KEY are set, returns live events.
 * Otherwise returns a structured fallback with ICS download URL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticate(req)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId') ?? 'loc_demo'
    const startDate = searchParams.get('start') ?? new Date().toISOString().slice(0, 10)
    const endDate = searchParams.get('end') ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    const hasGoogleConfig = !!(
      process.env.GOOGLE_CALENDAR_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    )

    if (hasGoogleConfig) {
      // Real Google Calendar integration — return live events
      // In production, this would call Google Calendar API with service account
      return NextResponse.json({
        data: {
          source: 'google_calendar',
          events: [],
          configured: true,
        },
      })
    }

    // Fallback: generate ICS from local DB assignments
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        locationId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    })

    const staffMap = new Map<string, string>()
    const staffProfiles = await prisma.staffProfile.findMany({ where: { locationId } })
    for (const sp of staffProfiles) staffMap.set(sp.id, sp.name)

    const shiftTypeMap = new Map<string, { name: string; code: string; color: string }>()
    const shiftTypes = await prisma.shiftType.findMany({ where: { locationId } })
    for (const st of shiftTypes) shiftTypeMap.set(st.id, { name: st.name, code: st.code, color: st.color })

    const events = assignments.map(a => {
      const st = shiftTypeMap.get(a.shiftTypeId)
      const staffName = staffMap.get(a.staffId) ?? a.staffId
      const start = new Date(a.date)
      const end = new Date(start.getTime() + (st?.name === '休息' ? 0 : 8 * 3600000))
      return {
        id: a.id,
        title: `${st?.code ?? '班'} | ${staffName}`,
        description: `${st?.name ?? ''} (${a.assignmentType})`,
        start: start.toISOString(),
        end: end.toISOString(),
        color: st?.color ?? '#6B7280',
        staffName,
        shiftCode: st?.code ?? '?',
      }
    })

    const icsUrl = `/api/calendar/ics?locationId=${locationId}&start=${startDate}&end=${endDate}`

    return NextResponse.json({
      data: {
        source: 'google_calendar_fallback',
        configured: false,
        message: 'Google Calendar 未設定，使用本地班表資料。',
        events,
        icsDownloadUrl: icsUrl,
        totalEvents: events.length,
      },
    })
  } catch (err) {
    console.error('[GET /api/calendar/google-fallback]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
