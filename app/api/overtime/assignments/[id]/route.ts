/**
 * DELETE /api/overtime/assignments/:id — delete a specific overtime assignment by ID.
 *
 * Delegated from the parent route handler; this file provides the Next.js App Router
 * params-based signature so DELETE /api/overtime/assignments/abc123 routes here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeAuditEvent } from '@/lib/audit'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id

    if (!assignmentId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'id is required' } },
        { status: 400 }
      )
    }

    // Fetch the existing record for audit snapshot
    const existing = await prisma.overtimeAssignment.findUnique({
      where: { id: assignmentId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `OvertimeAssignment ${assignmentId} not found` } },
        { status: 404 }
      )
    }

    await prisma.overtimeAssignment.delete({
      where: { id: assignmentId },
    })

    // Audit log
    await writeAuditEvent({
      organizationId: existing.organizationId,
      actorUserId: 'user_manager',
      action: 'DELETE',
      targetTable: 'OvertimeAssignment',
      targetId: assignmentId,
      beforeSnapshot: existing,
      afterSnapshot: null,
      extra: {
        route: 'DELETE /api/overtime/assignments/:id',
        deletedAssignmentType: 'OVERTIME',
      },
    })

    return NextResponse.json({
      data: { id: assignmentId, deleted: true },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[DELETE /api/overtime/assignments/:id]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
