/**
 * ShiftType CRUD API Routes — single shift type operations
 * GET    /api/shift-types/[id]  — get shift type by id
 * PATCH  /api/shift-types/[id]  — update shift type
 * DELETE /api/shift-types/[id] — delete shift type
 *
 * Auth required. MANAGER/ADMIN only. ADMIN required for delete.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, canAccessLocation } from '@/lib/rbac'

// ─── Schemas ───────────────────────────────────────────────────────────────────

const UpdateShiftTypeSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  isAllDay: z.boolean().optional(),
  isOnCall: z.boolean().optional(),
  supportsSegments: z.boolean().optional(),
})

// ─── GET /api/shift-types/[id] ─────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, 'shift-type:read')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const shiftType = await prisma.shiftType.findUnique({ where: { id: params.id } })

    if (!shiftType) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Shift type not found' } },
        { status: 404 }
      )
    }

    if (!canAccessLocation(user, shiftType.locationId)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot access this shift type' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      data: shiftType,
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/shift-types/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

// ─── PATCH /api/shift-types/[id] ───────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, 'shift-type:update')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const existing = await prisma.shiftType.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Shift type not found' } },
        { status: 404 }
      )
    }

    if (!canAccessLocation(user, existing.locationId)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot modify shift type outside your location' } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = UpdateShiftTypeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const shiftType = await prisma.shiftType.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return NextResponse.json({
      data: shiftType,
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[PATCH /api/shift-types/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

// ─── DELETE /api/shift-types/[id] ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, 'shift-type:delete')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const existing = await prisma.shiftType.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Shift type not found' } },
        { status: 404 }
      )
    }

    // Only ADMIN can delete
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only ADMIN can delete shift types' } },
        { status: 403 }
      )
    }

    await prisma.shiftType.delete({ where: { id: params.id } })

    return NextResponse.json({
      data: { id: params.id, deleted: true },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[DELETE /api/shift-types/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
