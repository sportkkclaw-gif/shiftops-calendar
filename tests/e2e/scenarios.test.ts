/**
 * ShiftOps Calendar — E2E Tests
 * Lightweight HTTP-driven E2E tests (no browser needed).
 * Tests full request-response cycles via actual Next.js API routes.
 * For production E2E, add Playwright on top of this foundation.
 *
 * IMPORTANT: E2E tests require a running Next.js server.
 * The test runner automatically starts next start before tests
 * and kills it after all tests complete.
 */

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const SERVER_PORT = process.env.E2E_PORT ?? '3000'

// ─── Built-in HTTP server bootstrap ────────────────────────────────────────
// Start next start once; reuse across all test files in this suite.
// Uses a global singleton so Jest's parallel-file loading doesn't spawn
// multiple servers.

import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

let serverProc: ChildProcess | null = null
let serverReady = false

async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) })
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

const START_SERVER = async () => {
  if (serverReady && serverProc) return
  if (serverProc) return

  console.log('\n🚀 Starting embedded Next.js server on port', SERVER_PORT, '...')

  serverProc = spawn('node', ['node_modules/.bin/next', 'start', '-p', SERVER_PORT], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', PORT: SERVER_PORT },
  })

  serverProc.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(chunk)
  })
  serverProc.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk)
  })

  serverProc.on('error', (err: Error) => {
    console.error('\n❌ Server process error:', err.message)
    serverProc = null
    serverReady = false
  })

  serverProc.on('exit', (code: number | null) => {
    if (code !== 0 && code !== null) {
      console.error('\n⚠️  Server exited with code', code)
    }
    serverProc = null
    serverReady = false
  })

  try {
    await waitForServer(`${BASE}/`, 30000)
    serverReady = true
    console.log('✅ Server ready.\n')
  } catch (err) {
    serverProc?.kill()
    serverProc = null
    serverReady = false
    throw err
  }
}

const STOP_SERVER = async () => {
  if (!serverProc) return
  console.log('\n🛑 Stopping embedded Next.js server ...')
  serverProc.kill()
  serverProc = null
  serverReady = false
  await new Promise(r => setTimeout(r, 500)) // give OS port release time
  console.log('✅ Server stopped.\n')
}

// Expose lifecycle globally so Jest parallel-file loading still singletons.
declare global {
  // eslint-disable-next-line no-var
  var __e2eServerProc: ChildProcess | null | undefined
  // eslint-disable-next-line no-var
  var __e2eServerReady: boolean | undefined
}

beforeAll(async () => {
  if (globalThis.__e2eServerReady) return
  if (globalThis.__e2eServerProc) {
    // Another file already started it; wait for it
    await waitForServer(`${BASE}/`, 20000)
    globalThis.__e2eServerReady = true
    return
  }
  globalThis.__e2eServerProc = serverProc
  globalThis.__e2eServerReady = serverReady
  await START_SERVER()
  globalThis.__e2eServerProc = serverProc
  globalThis.__e2eServerReady = serverReady
})

afterAll(async () => {
  // Only kill the server if this is the last test file shutting down.
  // Check that all tests across all files have finished by verifying
  // the proc is still ours and no other test file has set a new proc.
  const proc = globalThis.__e2eServerProc
  if (proc === serverProc) {
    globalThis.__e2eServerProc = null
    globalThis.__e2eServerReady = false
    await STOP_SERVER()
  }
})

// Simple fetch helper
async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : await res.text()
  return { status: res.status, body, isJson }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeJsonReq(body: unknown) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function makeGetReq() {
  return { method: 'GET' }
}

// ─── E2E Scenario Tests ─────────────────────────────────────────────────

describe('E2E: Homepage & Static Pages', () => {
  it('✓ GET / returns 200 with HTML', async () => {
    const res = await fetchJSON('/', makeGetReq())
    expect(res.status).toBe(200)
    expect(typeof res.body).toBe('string')
    expect((res.body as string).length).toBeGreaterThan(100)
  })

  it('✓ GET /calendar returns 200 with HTML', async () => {
    const res = await fetchJSON('/calendar', makeGetReq())
    expect(res.status).toBe(200)
    expect(typeof res.body).toBe('string')
  })
})

describe('E2E: Full AI Schedule Workflow', () => {
  it('✓ POST /api/ai/preview-schedule → previewToken', async () => {
    const req = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      dateRange: { start: '2026-04-01', end: '2026-04-07' },
      prompt: '做三休一',
    })
    const res = await fetchJSON('/api/ai/preview-schedule', req)
    expect(res.status).toBe(200)
    expect(res.isJson).toBe(true)
    const body = res.body as { data?: { previewToken?: string } }
    expect(body.data?.previewToken).toBeDefined()
  })

  it('✓ GET /api/ai/previews/[token] → preview data with data/meta wrapper', async () => {
    // First create a preview
    const createReq = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      dateRange: { start: '2026-04-01', end: '2026-04-07' },
      prompt: '做四休四',
    })
    const createRes = await fetchJSON('/api/ai/preview-schedule', createReq)
    expect(createRes.status).toBe(200)
    const token = (createRes.body as { data: { previewToken: string } }).data.previewToken

    // Then retrieve it
    const getRes = await fetchJSON(`/api/ai/previews/${token}`, makeGetReq())
    expect(getRes.status).toBe(200)
    const getBody = getRes.body as { data?: { previewToken?: string }, meta?: { requestId?: string } }
    expect(getBody.data?.previewToken).toBeDefined()
    expect(getBody.meta?.requestId).toBeDefined()
  })

  it('✓ POST /api/ai/apply-preview → applyRunId returned', async () => {
    const createReq = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      dateRange: { start: '2026-04-01', end: '2026-04-07' },
      prompt: 'ab 輪班',
    })
    const createRes = await fetchJSON('/api/ai/preview-schedule', createReq)
    const token = (createRes.body as { data: { previewToken: string } }).data.previewToken

    const applyReq = makeJsonReq({
      previewToken: token,
      organizationId: 'org_demo',
      locationId: 'loc_demo',
    })
    const applyRes = await fetchJSON('/api/ai/apply-preview', applyReq)
    expect(applyRes.status).toBe(200)
    const applyBody = applyRes.body as { data?: { success?: boolean, applyRunId?: string } }
    expect(applyBody.data?.success).toBe(true)
    expect(applyBody.data?.applyRunId).toBeDefined()
  })

  it('✓ POST /api/ai/apply-runs/[id]/rollback → success', async () => {
    const rollbackReq = makeJsonReq({
      applyRunId: 'run_e2e_test_001',
      organizationId: 'org_demo',
    })
    const res = await fetchJSON('/api/ai/apply-runs/run_e2e_test_001/rollback', rollbackReq)
    expect(res.status).toBe(200)
    const body = res.body as { data?: { success?: boolean, applyRunId?: string } }
    expect(body.data?.success).toBe(true)
    expect(body.data?.applyRunId).toBe('run_e2e_test_001')
  })

  it('✓ POST /api/export/jobs → jobId created', async () => {
    const req = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      type: 'PDF',
      options: { dateRange: { start: '2026-04-01', end: '2026-04-30' } },
    })
    const res = await fetchJSON('/api/export/jobs', req)
    expect(res.status).toBe(200)
    const body = res.body as { data?: { jobId?: string, status?: string } }
    expect(body.data?.jobId).toBeDefined()
    expect(body.data?.status).toBe('PENDING')
  })

  it('✓ GET /api/export/jobs/[jobId] → status COMPLETED with downloadUrl', async () => {
    // First create a job
    const createReq = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      type: 'CSV',
    })
    await fetchJSON('/api/export/jobs', createReq)

    // Then get the job status (using known test jobId)
    const res = await fetchJSON('/api/export/jobs/job_test123', makeGetReq())
    expect(res.status).toBe(200)
    const body = res.body as { data?: { jobId?: string, status?: string, downloadUrl?: string, meta?: { requestId?: string } } }
    expect(body.data?.jobId).toBe('job_test123')
    expect(body.data?.status).toBe('COMPLETED')
    expect(body.data?.downloadUrl).toBe('/api/export/jobs/job_test123/download')
    expect(body.meta?.requestId).toBeDefined()
  })
})

describe('E2E: Validation & Error Paths', () => {
  it('✓ POST preview-schedule with missing prompt → 400 VALIDATION_ERROR', async () => {
    const req = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      dateRange: { start: '2026-04-01', end: '2026-04-30' },
      // prompt missing
    })
    const res = await fetchJSON('/api/ai/preview-schedule', req)
    expect(res.status).toBe(400)
    const body = res.body as { error?: { code?: string } }
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('✓ POST apply-preview with missing previewToken → 400 VALIDATION_ERROR', async () => {
    const req = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
    })
    const res = await fetchJSON('/api/ai/apply-preview', req)
    expect(res.status).toBe(400)
    const body = res.body as { error?: { code?: string } }
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('✓ POST export/jobs with invalid type → 400 VALIDATION_ERROR', async () => {
    const req = makeJsonReq({
      organizationId: 'org_demo',
      locationId: 'loc_demo',
      type: 'INVALID_TYPE',
    })
    const res = await fetchJSON('/api/export/jobs', req)
    expect(res.status).toBe(400)
    const body = res.body as { error?: { code?: string } }
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })
})