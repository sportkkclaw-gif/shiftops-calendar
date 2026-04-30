/**
 * Overtime Assignments API
 *
 * POST  /api/overtime/assignments  — create an overtime assignment
 * DELETE /api/overtime/assignments/:id — cancel / remove an overtime assignment
 *
 * Overtime assignments are independent of regular ShiftAssignments and do NOT
 * override them. Each assignment carries assignmentType = 'OVERTIME'.
 *
 * Audit log written for every create / delete operation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { writeAuditEvent } from '@/lib/audit'

const CreateOvertimeAssignmentSchema = z.object({
  organizationId: z.string(),
  locationId: z.string(),
  staffId: z.string(),
  date: z.string(), // ISO date string YYYY-MM-DD
  targetShiftTypeId: z.string(),
  candidateId: z.string().optional(),
  assignmentId: z.string().optional(), // link to an existing OT candidate or regular assignment
  approvedBy: z.string().default('user_manager'),
})

const DeleteParamsSchema = z.object({
  id: z.string(),
})

// ─── POST /api/overtime/assignments ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateOvertimeAssignmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Create the OvertimeAssignment record
    const assignment = await prisma.overtimeAssignment.create({
      data: {
        organizationId: data.organizationId,
        locationId: data.locationId,
        staffId: data.staffId,
        date: new Date(data.date),
        targetShiftTypeId: data.targetShiftTypeId,
        candidateId: data.candidateId ?? null,
        assignmentId: data.assignmentId ?? null,
        approvedBy: data.approvedBy,
        status: 'confirmed',
      },
    })

    // Audit log
    await writeAuditEvent({
      organizationId: data.organizationId,
      actorUserId: data.approvedBy,
      action: 'CREATE',
      targetTable: 'OvertimeAssignment',
      targetId: assignment.id,
      afterSnapshot: assignment,
      extra: {
        route: 'POST /api/overtime/assignments',
        assignmentType: 'OVERTIME',
      },
    })

    return NextResponse.json({
      data: assignment,
      meta: { requestId: `req_${Date.now()}` },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/overtime/assignments]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/overtime/assignments/:id ────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const parsed = DeleteParamsSchema.safeParse({ id })
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'id query parameter is required' } },
        { status: 400 }
      )
    }

    const assignmentId = parsed.data.id

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

    // Audit log — log beforeSnapshot of the deleted record
    await writeAuditEvent({
      organizationId: existing.organizationId,
      actorUserId: 'user_manager',
      action: 'DELETE',
      targetTable: 'OvertimeAssignment',
      targetId: assignmentId,
      beforeSnapshot: existing,
      afterSnapshot: null,
      extra: {
        route: 'DELETE /api/overtime/assignments',
        deletedAssignmentType: 'OVERTIME',
      },
    })

    return NextResponse.json({
      data: { id: assignmentId, deleted: true },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[DELETE /api/overtime/assignments]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
