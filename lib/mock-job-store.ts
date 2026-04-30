/**
 * Process-global singleton Map stored on globalThis so it survives
 * Jest's module re-evaluation in ESM mode (each dynamic import() may
 * create a fresh module-scope variable, but globalThis is shared process-wide).
 * In production this would be replaced by a real database table.
 */

export interface MockExportJob {
  type: string
  status: string
  downloadUrl: string | null
  expiresAt: string | null
  createdAt: string
}

const GLOBAL_KEY = '__shiftops_mock_job_store__' as const

function getStore(): Map<string, MockExportJob> {
  const g = globalThis as Record<string, unknown>
  if (!g[GLOBAL_KEY] || !(g[GLOBAL_KEY] instanceof Map)) {
    g[GLOBAL_KEY] = new Map<string, MockExportJob>()
  }
  return g[GLOBAL_KEY] as Map<string, MockExportJob>
}

export function setMockJob(jobId: string, job: MockExportJob): void {
  getStore().set(jobId, job)
}

export function getMockJob(jobId: string): MockExportJob | undefined {
  return getStore().get(jobId)
}

export function clearMockJobs(): void {
  getStore().clear()
}
