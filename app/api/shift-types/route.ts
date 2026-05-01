/**
 * ShiftType CRUD API Routes
 * GET  /api/shift-types         — list shift types
 * POST /api/shift-types         — create shift type
 *
 * Auth required. MANAGER/ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, canAccessLocation } from '@/lib/rbac'
import { previewShiftTypes, shouldUsePreviewFallback } from '@/lib/preview-fallback'

// ─── Schemas ───────────────────────────────────────────────────────────────────

const CreateShiftTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  organizationId: z.string(),
  locationId: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  isAllDay: z.boolean().default(false),
  isOnCall: z.boolean().default(false),
  supportsSegments: z.boolean().default(false),
})

const ListShiftTypeSchema = z.object({
  organizationId: z.string(),
  locationId: z.string().optional(),
  isOnCall: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// ─── GET /api/shift-types ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'shift-type:read')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const searchParams = new URL(req.url).searchParams
    const params = Object.fromEntries(searchParams.entries())
    const parsed = ListShiftTypeSchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid query params', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { organizationId, locationId, isOnCall } = parsed.data

    if (locationId && !canAccessLocation(user, locationId)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot access this location' } },
        { status: 403 }
      )
    }

    const where: Record<string, unknown> = { organizationId }
    if (locationId) where.locationId = locationId
    if (isOnCall !== undefined) where.isOnCall = isOnCall === 'true'

    if (user.role === 'MANAGER' && user.locationId) {
      where.locationId = user.locationId
    }

    const page = Math.max(1, parseInt(parsed.data.page ?? '1', 10))
    const limit = Math.min(100, parseInt(parsed.data.limit ?? '50', 10))
    const skip = (page - 1) * limit

    const [shiftTypes, total] = await Promise.all([
      prisma.shiftType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.shiftType.count({ where }),
    ])

    return NextResponse.json({
      data: shiftTypes,
      meta: {
        requestId: `req_${Date.now()}`,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('[GET /api/shift-types]', err)
    if (shouldUsePreviewFallback()) {
      const data = previewShiftTypes.filter(s => s.organizationId === 'org_demo')
      return NextResponse.json({ data, meta: { requestId: `req_${Date.now()}`, page: 1, limit: data.length, total: data.length, totalPages: 1, previewFallback: true } })
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

// ─── POST /api/shift-types ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'shift-type:create')
  if (auth.error) return auth.error
  const user = auth.user

  try {
    const body = await req.json()
    const parsed = CreateShiftTypeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { organizationId, locationId } = parsed.data

    if (user.role === 'MANAGER' && user.locationId !== locationId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Can only create shift types in your own location' } },
        { status: 403 }
      )
    }

    if (user.role === 'MEMBER') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Members cannot create shift types' } },
        { status: 403 }
      )
    }

    const shiftType = await prisma.shiftType.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        color: parsed.data.color,
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        durationMinutes: parsed.data.durationMinutes,
        isAllDay: parsed.data.isAllDay,
        isOnCall: parsed.data.isOnCall,
        supportsSegments: parsed.data.supportsSegments,
      },
    })

    return NextResponse.json({
      data: shiftType,
      meta: { requestId: `req_${Date.now()}` },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/shift-types]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
