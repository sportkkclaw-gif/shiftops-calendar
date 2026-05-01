/**
 * Staff CRUD API Routes
 * GET  /api/staff          — list staff (location-filtered for MANAGER)
 * POST /api/staff          — create staff
 *
 * Auth: Bearer token or session cookie required.
 * RBAC: MANAGER/ADMIN only (MEMBER cannot access staff list).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, canAccessLocation } from '@/lib/rbac'
import { previewStaff, shouldUsePreviewFallback } from '@/lib/preview-fallback'

// ─── Schemas ───────────────────────────────────────────────────────────────────

const CreateStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  roleCode: z.string().min(1, 'roleCode is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  organizationId: z.string(),
  locationId: z.string(),
  active: z.boolean().default(true),
})

const ListStaffSchema = z.object({
  organizationId: z.string(),
  locationId: z.string().optional(),
  active: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// ─── GET /api/staff ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'staff:read')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const searchParams = new URL(req.url).searchParams
    const params = Object.fromEntries(searchParams.entries())

    const parsed = ListStaffSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid query params', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { organizationId, locationId, active } = parsed.data

    // Location access check
    if (locationId && !canAccessLocation(user, locationId)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot access this location' } },
        { status: 403 }
      )
    }

    // Build where clause
    const where: Record<string, unknown> = { organizationId }
    if (locationId) where.locationId = locationId
    if (active !== undefined) where.active = active === 'true'

    // For MANAGER: always filter by their location
    if (user.role === 'MANAGER' && user.locationId) {
      where.locationId = user.locationId
    }

    const page = Math.max(1, parseInt(parsed.data.page ?? '1', 10))
    const limit = Math.min(100, parseInt(parsed.data.limit ?? '50', 10))
    const skip = (page - 1) * limit

    const [staff, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.staffProfile.count({ where }),
    ])

    return NextResponse.json({
      data: staff,
      meta: {
        requestId: `req_${Date.now()}`,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('[GET /api/staff]', err)
    if (shouldUsePreviewFallback()) {
      const data = previewStaff.filter(s => s.organizationId === 'org_demo')
      return NextResponse.json({ data, meta: { requestId: `req_${Date.now()}`, page: 1, limit: data.length, total: data.length, totalPages: 1, previewFallback: true } })
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

// ─── POST /api/staff ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'staff:create')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const body = await req.json()
    const parsed = CreateStaffSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { organizationId, locationId } = parsed.data

    // MANAGER can only create staff in their own location
    if (user.role === 'MANAGER' && user.locationId !== locationId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Can only create staff in your own location' } },
        { status: 403 }
      )
    }

    // ADMIN can create anywhere
    // MANAGER: already checked above
    // MEMBER: should not reach here (caught by requireAuth)
    if (user.role === 'MEMBER') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Members cannot create staff' } },
        { status: 403 }
      )
    }

    const staff = await prisma.staffProfile.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        roleCode: parsed.data.roleCode,
        color: parsed.data.color,
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        active: parsed.data.active,
      },
    })

    return NextResponse.json({
      data: staff,
      meta: { requestId: `req_${Date.now()}` },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/staff]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
