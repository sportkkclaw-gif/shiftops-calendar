import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { setMockJob } from '@/lib/mock-job-store'

const CreateExportJobSchema = z.object({
  organizationId: z.string(),
  locationId: z.string(),
  type: z.enum(['PDF', 'PNG', 'ICS', 'CSV']),
  options: z.object({
    dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
    format: z.string().optional(),
    locationId: z.string().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateExportJobSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { mockExportJob } = await import('@/lib/mock-ai')
    const result = await mockExportJob(
      parsed.data.organizationId,
      parsed.data.locationId,
      parsed.data.type,
      'user_manager'
    )

    // Persist the job with its requested type so GET can return it correctly
    setMockJob(result.jobId, {
      type: result.type,
      status: result.status,
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({
      data: result,
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[POST /api/export/jobs]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
