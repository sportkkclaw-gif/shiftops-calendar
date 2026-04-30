/**
 * AI Preferences Route
 * GET /api/ai/preferences
 * PATCH /api/ai/preferences
 *
 * Read/write per-user AI preference memory scoped to organization.
 * Requires authenticated user with ai:preview permission.
 * Stores arbitrary JSON preferences keyed by userId + org + preferenceKey.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const PreferenceKeySchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().optional(),
  preferenceKey: z.string().min(1).max(128).default('default'),
})

const UpsertSchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().optional(),
  preferenceKey: z.string().min(1).max(128).default('default'),
  preferenceJson: z.string().min(1).max(65535), // 64KB max for TEXT column
})

// ─── GET /api/ai/preferences ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'ai:preview')
  if (auth.error) return auth.error

  try {
    const searchParams = new URL(req.url).searchParams
    const params = Object.fromEntries(searchParams.entries())

  const parsed = PreferenceKeySchema.safeParse({
    organizationId: params.organizationId ?? auth.user.organizationId,
    locationId: params.locationId ?? undefined,
    preferenceKey: params.preferenceKey ?? 'default',
  })

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { organizationId, locationId, preferenceKey } = parsed.data

    // Enforce organization scoping: caller cannot query another org
    if (organizationId !== auth.user.organizationId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot access preferences of another organization' } },
        { status: 403 }
      )
    }

    // Enforce user can only read their own preferences, or admin/manager for their org
    const where: Prisma.UserAiPreferenceWhereInput = {
      userId: auth.user.id,
      organizationId,
      preferenceKey,
    }
    if (locationId) where.locationId = locationId

    const pref = await prisma.userAiPreference.findFirst({ where })

    return NextResponse.json({
      data: pref ? {
        id: pref.id,
        userId: pref.userId,
        organizationId: pref.organizationId,
        locationId: pref.locationId,
        preferenceKey: pref.preferenceKey,
        preferenceJson: pref.preferenceJson,
        createdAt: pref.createdAt,
        updatedAt: pref.updatedAt,
      } : null,
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/ai/preferences]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/ai/preferences ─────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, 'ai:preview')
  if (auth.error) return auth.error

  try {
    const body = await req.json()
    const parsed = UpsertSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const { organizationId, locationId, preferenceKey, preferenceJson } = parsed.data

    // Enforce organization scoping: caller cannot write to another org
    if (organizationId !== auth.user.organizationId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot modify preferences of another organization' } },
        { status: 403 }
      )
    }

    // Validate JSON parseability
    try {
      JSON.parse(preferenceJson)
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'preferenceJson must be valid JSON' } },
        { status: 400 }
      )
    }

    // Upsert: update if exists, create if not
    const record = await prisma.userAiPreference.upsert({
      where: {
        userId_organizationId_preferenceKey: {
          userId: auth.user.id,
          organizationId,
          preferenceKey,
        },
      },
      update: {
        locationId: locationId ?? null,
        preferenceJson,
      },
      create: {
        userId: auth.user.id,
        organizationId,
        locationId: locationId ?? null,
        preferenceKey,
        preferenceJson,
      },
    })

    return NextResponse.json({
      data: {
        id: record.id,
        userId: record.userId,
        organizationId: record.organizationId,
        locationId: record.locationId,
        preferenceKey: record.preferenceKey,
        preferenceJson: record.preferenceJson,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[PATCH /api/ai/preferences]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
