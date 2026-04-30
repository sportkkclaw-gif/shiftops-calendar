/**
 * Named Pattern Seed Offset API
 * GET /api/schedule/named-patterns/[id]  — read a named pattern seed
 * PATCH /api/schedule/named-patterns/[id] — update offset parameters
 *
 * C23: NamedPatternSeed offset is now adjustable via API.
 * Supported offset fields:
 *   - phaseOffset (number): shifts the phase sequence start point (0-based)
 *   - shiftGroupOffset (number): offsets which staff group gets which shift phase
 *   - cycleDays (number): overrides cycle length for named patterns
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import { z } from 'zod'

const PatchNamedPatternSchema = z.object({
  phaseOffset: z.number().int().min(0).max(6).optional(),
  shiftGroupOffset: z.number().int().min(0).max(6).optional(),
  cycleDays: z.number().int().min(1).max(31).optional(),
})

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, 'assignment:read')
  if (auth.error) return auth.error

  try {
    const seed = await prisma.namedPatternSeed.findUnique({ where: { id: params.id } })
    if (!seed) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'NamedPatternSeed not found' } }, { status: 404 })
    }

    const config = JSON.parse(seed.defaultConfig)

    return NextResponse.json({
      data: {
        id: seed.id,
        name: seed.name,
        patternType: seed.patternType,
        description: seed.description,
        defaultConfig: config,
        // Resolve offset fields from config if present
        phaseOffset: (config.phaseOffset as number) ?? 0,
        shiftGroupOffset: (config.shiftGroupOffset as number) ?? 0,
        cycleDays: (config.cycleDays as number) ?? 7,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[GET /api/schedule/named-patterns/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, 'assignment:write')
  if (auth.error) return auth.error

  try {
    const body = await req.json()
    const parsed = PatchNamedPatternSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const seed = await prisma.namedPatternSeed.findUnique({ where: { id: params.id } })
    if (!seed) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'NamedPatternSeed not found' } }, { status: 404 })
    }

    // Merge new offsets into existing config
    const existingConfig = JSON.parse(seed.defaultConfig)
    const updates = parsed.data
    const newConfig = {
      ...existingConfig,
      ...(updates.cycleDays !== undefined ? { cycleDays: updates.cycleDays } : {}),
      ...(updates.phaseOffset !== undefined ? { phaseOffset: updates.phaseOffset } : {}),
      ...(updates.shiftGroupOffset !== undefined ? { shiftGroupOffset: updates.shiftGroupOffset } : {}),
    }

    const updated = await prisma.namedPatternSeed.update({
      where: { id: params.id },
      data: { defaultConfig: JSON.stringify(newConfig) },
    })

    const resolvedConfig = JSON.parse(updated.defaultConfig)
    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        patternType: updated.patternType,
        description: updated.description,
        defaultConfig: resolvedConfig,
        phaseOffset: (resolvedConfig.phaseOffset as number) ?? 0,
        shiftGroupOffset: (resolvedConfig.shiftGroupOffset as number) ?? 0,
        cycleDays: (resolvedConfig.cycleDays as number) ?? 7,
      },
      meta: { requestId: `req_${Date.now()}` },
    })
  } catch (err) {
    console.error('[PATCH /api/schedule/named-patterns/[id]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
