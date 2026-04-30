/**
 * SwapRequest API — POST + GET for swap request workflow
 * POST   /api/swap-requests          — member creates a swap request
 * GET    /api/swap-requests         — list swap requests (manager sees all, member sees own)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'

const CreateSwapRequestSchema = z.object({
  organizationId: z.string(),
  requesterId: z.string(),
  requesterName: z.string(),
  targetDate: z.string(), // ISO date string
  targetShiftTypeId: z.string(),
  desiredPartnerId: z.string().optional(),
  desiredPartnerName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticate(req)
    if (error) return error
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 })

    const body = await req.json()
    const parsed = CreateSwapRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const data = parsed.data

    // AI suggests alternatives in mock mode
    let aiSuggestions: string | null = null
    if (process.env.MOCK_AI === 'true') {
      const suggestions = [
        { staffId: 'staff_1', name: '王小明', score: 0.88, reason: '該日無班，可支援' },
        { staffId: 'staff_2', name: '李小華', score: 0.75, reason: '具備相同技能資格' },
        { staffId: 'staff_3', name: '陳大山', score: 0.62, reason: '距離近，可快速到崗' },
      ]
      aiSuggestions = JSON.stringify(suggestions)
    }

    const swapReq = await prisma.swapRequest.create({
      data: {
        organizationId: data.organizationId,
        requesterId: data.requesterId,
        requesterName: data.requesterName,
        targetDate: new Date(data.targetDate),
        targetShiftTypeId: data.targetShiftTypeId,
        desiredPartnerId: data.desiredPartnerId,
        desiredPartnerName: data.desiredPartnerName,
        aiSuggestions,
        status: aiSuggestions ? 'ai_suggested' : 'pending',
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        organizationId: data.organizationId,
        actorUserId: user.id,
        action: 'CREATE',
        targetTable: 'SwapRequest',
        targetId: swapReq.id,
        afterSnapshot: JSON.stringify(swapReq),
        metadata: JSON.stringify({ source: 'api', email: user.email }),
      },
    })

    return NextResponse.json({
      data: swapReq,
      meta: { requestId: `req_${Date.now()}` },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/swap-requests]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticate(req)
    if (error) return error
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId') ?? user.organizationId
    const status = searchParams.get('status')
    const myOnly = searchParams.get('myOnly') === 'true'

    const where: Record<string, unknown> = { organizationId: organizationId as string }
    if (myOnly) {
      where.requesterId = user.id
    }
    if (status) {
      where.status = status
    }

    // Managers see all; members see only their own
    const requests = await prisma.swapRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      data: requests,
      meta: { requestId: `req_${Date.now()}`, count: requests.length },
    })
  } catch (err) {
    console.error('[GET /api/swap-requests]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
