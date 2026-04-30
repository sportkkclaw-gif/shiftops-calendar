import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeAuditEvent } from '@/lib/audit'
import { upsertConversation } from '@/lib/ai-conversation'

const ApplyPreviewSchema = z.object({
  previewToken: z.string(),
  organizationId: z.string(),
  locationId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ApplyPreviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const mockMode = process.env.MOCK_AI === 'true'

    if (mockMode) {
      const { mockApplyPreview } = await import('@/lib/mock-ai')
      const result = await mockApplyPreview(
        parsed.data.previewToken,
        parsed.data.organizationId,
        parsed.data.locationId,
        'user_manager'
      )

      // Audit log: AI preview applied (schedule changes committed)
      await writeAuditEvent({
        organizationId: parsed.data.organizationId,
        actorUserId: 'user_manager',
        action: 'AI_PREVIEW_APPLIED',
        targetTable: 'RuleApplyRun',
        targetId: result.applyRunId,
        beforeSnapshot: result.beforeSnapshot,
        afterSnapshot: { applyRunId: result.applyRunId, appliedCount: result.appliedCount },
        extra: {
          route: 'POST /api/ai/apply-preview',
          previewToken: parsed.data.previewToken,
        },
      })

      // Persist AI conversation: assistant confirms apply action
      await upsertConversation({
        organizationId: parsed.data.organizationId,
        actorUserId: 'user_manager',
        role: 'MANAGER',
        message: {
          role: 'assistant',
          content: `Applied preview ${parsed.data.previewToken}: ${result.appliedCount} assignments committed.`,
        },
        metadata: { action: 'apply-preview', applyRunId: result.applyRunId, appliedCount: result.appliedCount },
      }).catch(console.warn)

      return NextResponse.json({
        data: result,
        meta: { requestId: `req_${Date.now()}` },
      })
    }

    return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Real AI not configured' } }, { status: 501 })
  } catch (err) {
    console.error('[POST /api/ai/apply-preview]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
