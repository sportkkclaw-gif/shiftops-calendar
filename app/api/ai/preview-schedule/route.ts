import { NextRequest, NextResponse } from 'next/server'
import { mockPreviewSchedule } from '@/lib/mock-ai'
import { z } from 'zod'
import { writeAuditEvent } from '@/lib/audit'
import { upsertConversation } from '@/lib/ai-conversation'

const PreviewScheduleSchema = z.object({
  organizationId: z.string(),
  locationId: z.string(),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  prompt: z.string(),
  /** C26: explicit skill/role/certification constraints (optional, can also be parsed from prompt) */
  constraints: z.array(z.object({
    type: z.enum(['skill', 'certification', 'role']),
    code: z.string(),
    label: z.string(),
    required: z.boolean(),
  })).optional(),
})

// Script M documented payload: { prompt, startDate, endDate, mockMode }
// Accepts flat field aliases including startDate/endDate (not just start/end)
const PreviewScheduleSchemaSimplified = z.object({
  orgId: z.string().optional(),
  locId: z.string().optional(),
  range: z.union([
    z.object({ start: z.string(), end: z.string() }),
    z.string(), // allow ISO date range string like "2026-04-01/2026-04-30"
  ]).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  startDate: z.string().optional(),  // Script M documented alias
  endDate: z.string().optional(),    // Script M documented alias
  prompt: z.string(),
  /** C26: explicit constraints passed directly (bypasses prompt parsing) */
  constraints: z.array(z.object({
    type: z.enum(['skill', 'certification', 'role']),
    code: z.string(),
    label: z.string(),
    required: z.boolean(),
  })).optional(),
})

function normalizePreviewBody(body: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...body }
  if (!normalized.organizationId) {
    normalized.organizationId = (normalized.orgId as string) || 'org_demo'
  }
  if (!normalized.locationId) {
    normalized.locationId = (normalized.locId as string) || 'loc_demo'
  }
  if (!normalized.dateRange) {
    if (normalized.range) {
      if (typeof normalized.range === 'string') {
        const [start, end] = normalized.range.split('/')
        normalized.dateRange = { start: start || normalized.range, end: end || normalized.range }
      } else {
        normalized.dateRange = normalized.range
      }
    } else if ((normalized.start && normalized.end) || (normalized.startDate && normalized.endDate)) {
      const s = (normalized.start || normalized.startDate) as string
      const e = (normalized.end || normalized.endDate) as string
      normalized.dateRange = { start: s, end: e }
    }
  }
  return normalized
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const normalized = normalizePreviewBody(body as Record<string, unknown>)
    const parsed = PreviewScheduleSchema.safeParse(normalized)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const input = parsed.data
    const mockMode = process.env.MOCK_AI === 'true'

    if (!mockMode) {
      // Real AI call would go here
      return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Real AI not configured' } }, { status: 501 })
    }

    const preview = await mockPreviewSchedule(input)

    // Audit log: AI schedule preview generated
    await writeAuditEvent({
      organizationId: input.organizationId,
      actorUserId: 'user_manager', // TODO: wire to real authenticated user when auth is integrated
      action: 'AI_PREVIEW_GENERATED',
      targetTable: 'AISchedulePreview',
      targetId: preview.previewToken,
      afterSnapshot: {
        previewToken: preview.previewToken,
        status: preview.status,
        assignmentCount: preview.proposedAssignments.length,
      },
      extra: {
        route: 'POST /api/ai/preview-schedule',
        promptLength: input.prompt.length,
        dateRange: input.dateRange,
      },
    })

    // Persist AI conversation: user prompt + assistant preview summary
    await upsertConversation({
      organizationId: input.organizationId,
      actorUserId: 'user_manager',
      role: 'MANAGER',
      message: { role: 'user', content: input.prompt },
      metadata: { intent: 'preview-schedule', dateRange: input.dateRange },
    }).catch(console.warn)

    await upsertConversation({
      organizationId: input.organizationId,
      actorUserId: 'user_manager',
      role: 'MANAGER',
      message: {
        role: 'assistant',
        content: `Preview generated: ${preview.proposedAssignments.length} assignments, token=${preview.previewToken}`,
      },
      metadata: { action: 'preview-generated', previewToken: preview.previewToken },
    }).catch(console.warn)

    return NextResponse.json({
      data: preview,
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[POST /api/ai/preview-schedule]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
