/**
 * Debug test for mock job store persistence across dynamic imports
 */
import { setMockJob, getMockJob } from '@/lib/mock-job-store'

describe('mock-job-store global persistence', () => {
  it('should store and retrieve job type via globalThis', () => {
    setMockJob('debug_job_1', {
      type: 'ICS',
      status: 'PENDING',
      downloadUrl: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    })
    const stored = getMockJob('debug_job_1')
    expect(stored).toBeDefined()
    expect(stored?.type).toBe('ICS')
  })
})
