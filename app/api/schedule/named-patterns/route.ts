/**
 * Named Pattern Seed Listing API
 * GET /api/schedule/named-patterns  — list all named pattern seeds
 *
 * C23: Supports listing NamedPatternSeed for UI selection/management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, 'assignment:read')
  if (auth.error) return auth.error

  try {
    const seeds = await prisma.namedPatternSeed.findMany({
      orderBy: { name: 'asc' },
    })

    const data = seeds.map((seed) => {
      const config = JSON.parse(seed.defaultConfig)
      return {
        id: seed.id,
        name: seed.name,
        patternType: seed.patternType,
        description: seed.description,
        phaseOffset: (config.phaseOffset as number) ?? 0,
        shiftGroupOffset: (config.shiftGroupOffset as number) ?? 0,
        cycleDays: (config.cycleDays as number) ?? 7,
      }
    })

    return NextResponse.json({
      data,
      meta: { requestId: `req_${Date.now()}`, total: data.length },
    })
  } catch (err) {
    console.error('[GET /api/schedule/named-patterns]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
