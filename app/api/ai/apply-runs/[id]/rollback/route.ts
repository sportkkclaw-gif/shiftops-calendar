import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeAuditEvent } from '@/lib/audit'

const RollbackSchema = z.object({
  applyRunId: z.string(),
  organizationId: z.string(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const parsed = RollbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const mockMode = process.env.MOCK_AI === 'true'

    if (mockMode) {
      const { mockRollback } = await import('@/lib/mock-ai')
      const result = await mockRollback(parsed.data.applyRunId, parsed.data.organizationId, 'user_manager')

      // Audit log: AI apply run rolled back
      await writeAuditEvent({
        organizationId: parsed.data.organizationId,
        actorUserId: 'user_manager',
        action: 'AI_APPLY_ROLLBACK',
        targetTable: 'RuleApplyRun',
        targetId: parsed.data.applyRunId,
        beforeSnapshot: { rolledBackAssignmentIds: result.rolledBackAssignmentIds },
        afterSnapshot: null,
        extra: {
          route: 'POST /api/ai/apply-runs/[id]/rollback',
          applyRunId: parsed.data.applyRunId,
        },
      })

      return NextResponse.json({
        data: result,
        meta: { requestId: `req_${Date.now()}` },
      })
    }

    return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Real AI not configured' } }, { status: 501 })
  } catch (err) {
    console.error('[POST /api/ai/apply-runs/[id]/rollback]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
