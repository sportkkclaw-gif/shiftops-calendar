/**
 * ICS Download API — generates ICS calendar file from local assignments.
 * Used as Google Calendar fallback.
 * GET /api/calendar/ics?locationId=...&start=...&end=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICSText(s: string): string {
  return s.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId') ?? 'loc_demo'
    const start = searchParams.get('start') ?? new Date().toISOString().slice(0, 10)
    const end = searchParams.get('end') ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        locationId,
        date: {
          gte: new Date(start),
          lte: new Date(end),
        },
      },
    })

    const staffMap = new Map<string, string>()
    const staffProfiles = await prisma.staffProfile.findMany({ where: { locationId } })
    for (const sp of staffProfiles) staffMap.set(sp.id, sp.name)

    const shiftTypeMap = new Map<string, { name: string; code: string }>()
    const shiftTypes = await prisma.shiftType.findMany({ where: { locationId } })
    for (const st of shiftTypes) shiftTypeMap.set(st.id, { name: st.name, code: st.code })

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ShiftOps Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ShiftOps Calendar',
    ]

    for (const a of assignments) {
      const st = shiftTypeMap.get(a.shiftTypeId)
      const staffName = staffMap.get(a.staffId) ?? a.staffId
      const startDate = new Date(a.date)
      const endDate = new Date(startDate.getTime() + 8 * 3600000)

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${a.id}@shiftops`)
      lines.push(`DTSTAMP:${formatICSDate(new Date())}`)
      lines.push(`DTSTART:${formatICSDate(startDate)}`)
      lines.push(`DTEND:${formatICSDate(endDate)}`)
      lines.push(`SUMMARY:${escapeICSText(`${st?.code ?? '班'} | ${staffName}`)}`)
      lines.push(`DESCRIPTION:${escapeICSText(`${st?.name ?? ''} (${a.assignmentType})`)}`)
      if (st?.code) lines.push(`CATEGORIES:${st.code}`)
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    const ics = lines.join('\r\n')
    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="shiftops-${start}-${end}.ics"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/calendar/ics]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
