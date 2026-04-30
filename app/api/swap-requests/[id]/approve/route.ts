/**
 * SwapRequest Approval API — manager approves/rejects a swap request
 * PATCH  /api/swap-requests/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticate, requireRoles } from '@/lib/auth'

const ApproveSwapSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(req)
    if (error) return error

    // Only managers/admins can approve
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    const roleError = requireRoles(user, 'ADMIN', 'MANAGER')
    if (roleError) return roleError

    const body = await req.json()
    const parsed = ApproveSwapSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
        { status: 400 }
      )
    }

    const { status, comment } = parsed.data

    const existing = await prisma.swapRequest.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'SwapRequest not found' } }, { status: 404 })
    }

    const updated = await prisma.swapRequest.update({
      where: { id: params.id },
      data: {
        status,
        managerId: user.id,
        managerComment: comment ?? null,
        approvedAt: status === 'approved' ? new Date() : null,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        organizationId: existing.organizationId,
        actorUserId: user.id,
        action: status === 'approved' ? 'SWAP_APPROVED' : 'SWAP_REJECTED',
        targetTable: 'SwapRequest',
        targetId: existing.id,
        beforeSnapshot: JSON.stringify(existing),
        afterSnapshot: JSON.stringify(updated),
        metadata: JSON.stringify({ email: user.email, comment }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/swap-requests/[id]/approve]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
