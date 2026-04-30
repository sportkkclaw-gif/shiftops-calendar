/**
 * Staff CRUD API Routes — single staff operations
 * GET    /api/staff/[id]  — get staff by id
 * PATCH  /api/staff/[id]  — update staff
 * DELETE /api/staff/[id] — delete staff
 *
 * Auth required. MANAGER can only modify their own location's staff.
 * ADMIN can modify anywhere.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, canAccessLocation } from '@/lib/rbac'

// ─── Schemas ───────────────────────────────────────────────────────────────────

const UpdateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  roleCode: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  active: z.boolean().optional(),
})

// ─── GET /api/staff/[id] ───────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, 'staff:read')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const staff = await prisma.staffProfile.findUnique({ where: { id: params.id } })

    if (!staff) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Staff not found' } },
        { status: 404 }
      )
    }

    // Location check for MANAGER
    if (!canAccessLocation(user, staff.locationId)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot access this staff record' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      data: staff,
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/staff/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

// ─── PATCH /api/staff/[id] ─────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, 'staff:update')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    // First check the existing staff record
    const existing = await prisma.staffProfile.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Staff not found' } },
        { status: 404 }
      )
    }

    // MANAGER: can only modify their own location's staff
    if (!canAccessLocation(user, existing.locationId)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot modify staff outside your location' } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = UpdateStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const staff = await prisma.staffProfile.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return NextResponse.json({
      data: staff,
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[PATCH /api/staff/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

// ─── DELETE /api/staff/[id] ───────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, 'staff:delete')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const existing = await prisma.staffProfile.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Staff not found' } },
        { status: 404 }
      )
    }

    // Only ADMIN can delete (not MANAGER, per RBAC matrix)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only ADMIN can delete staff' } },
        { status: 403 }
      )
    }

    await prisma.staffProfile.delete({ where: { id: params.id } })

    return NextResponse.json({
      data: { id: params.id, deleted: true },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[DELETE /api/staff/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
