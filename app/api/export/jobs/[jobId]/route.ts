import { NextRequest, NextResponse } from 'next/server'
import { getMockJob } from '@/lib/mock-job-store'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId
    const mockMode = process.env.MOCK_AI === 'true'

    if (mockMode) {
      // Look up persisted job; return stored type (not hardcoded PDF)
      const stored = getMockJob(jobId)
      const mockResult = {
        jobId,
        status: stored?.status ?? 'COMPLETED',
        type: stored?.type ?? 'PDF',
        downloadUrl: stored?.downloadUrl ?? `/api/export/jobs/${jobId}/download`,
        expiresAt: stored?.expiresAt ?? new Date(Date.now() + 3600 * 1000).toISOString(),
        createdAt: stored?.createdAt ?? new Date().toISOString(),
      }
      return NextResponse.json({
        data: mockResult,
        meta: { requestId: `req_${Date.now()}` },
      })
    }

    return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Real DB not configured' } }, { status: 501 })
  } catch (err) {
    console.error('[GET /api/export/jobs/[jobId]]', err)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
