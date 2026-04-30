/**
 * POST /api/ai/export-command
 *
 * Natural-language export trigger.
 * Accepts a free-text prompt describing the desired export and creates an ExportJob,
 * inferring the format (PDF / PNG / ICS / CSV) from keywords with PDF as default.
 *
 * Audit log: AI_EXPORT_COMMAND_ISSUED
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeAuditEvent } from '@/lib/audit'
import { setMockJob } from '@/lib/mock-job-store'

const ExportCommandSchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
  organizationId: z.string().default('org_demo'),
  locationId: z.string().default('loc_demo'),
})

/** Infer export type from natural-language prompt. */
function inferExportType(prompt: string): 'PDF' | 'PNG' | 'ICS' | 'CSV' {
  const lower = prompt.toLowerCase()
  if (lower.includes('ics') || lower.includes('calendar') || lower.includes('行事曆') || lower.includes('日曆')) return 'ICS'
  if (lower.includes('png') || lower.includes('image') || lower.includes('圖片') || lower.includes('圖')) return 'PNG'
  if (lower.includes('csv') || lower.includes('spreadsheet') || lower.includes('試算表') || lower.includes('excel')) return 'CSV'
  return 'PDF' // sensible default
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ExportCommandSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { prompt, organizationId, locationId } = parsed.data
    const exportType = inferExportType(prompt)

    const mockMode = process.env.MOCK_AI === 'true'

    if (mockMode) {
      const { mockExportJob } = await import('@/lib/mock-ai')
      const result = await mockExportJob(organizationId, locationId, exportType, 'user_manager')

      // Persist job state for GET /api/export/jobs/:id
      setMockJob(result.jobId, {
        type: result.type,
        status: result.status,
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt,
        createdAt: new Date().toISOString(),
      })

      // Audit log: natural-language export command issued
      await writeAuditEvent({
        organizationId,
        actorUserId: 'user_manager',
        action: 'AI_EXPORT_COMMAND_ISSUED',
        targetTable: 'ExportJob',
        targetId: result.jobId,
        afterSnapshot: { jobId: result.jobId, type: result.type, status: result.status },
        extra: {
          route: 'POST /api/ai/export-command',
          promptLength: prompt.length,
          inferredType: exportType,
        },
      })

      return NextResponse.json({
        data: result,
        meta: { requestId: `req_${Date.now()}` },
      })
    }

    return NextResponse.json(
      { error: { code: 'NOT_IMPLEMENTED', message: 'Real AI not configured' } },
      { status: 501 }
    )
  } catch (err) {
    console.error('[POST /api/ai/export-command]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
