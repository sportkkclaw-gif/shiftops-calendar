import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    // In mock mode, generate a preview on-the-fly from the token
    const mockMode = process.env.MOCK_AI === 'true'

    if (mockMode) {
      const { mockPreviewSchedule } = await import('@/lib/mock-ai')
      const preview = await mockPreviewSchedule({
        organizationId: 'org_demo',
        locationId: 'loc_demo',
        dateRange: { start: '2026-04-01', end: '2026-04-30' },
        prompt: '做三休一',
      })

      return NextResponse.json({
        data: { ...preview, previewToken: token },
        meta: { requestId: `req_${Date.now()}` },
      })
    }

    // Real DB lookup
    const record = await prisma.aISchedulePreview.findUnique({
      where: { previewToken: token },
    })

    if (!record) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Preview not found' } }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        previewToken: record.previewToken,
        status: record.status,
        proposedAssignments: JSON.parse(record.proposedAssignments),
        calendarProjection: JSON.parse(record.calendarProjection),
        warnings: JSON.parse(record.warnings),
        beforeSnapshot: JSON.parse(record.beforeSnapshot),
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/ai/previews/[token]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
