/**
 * Jest setup for API tests
 * Starts one shared Next.js server for the API suite and tears it down safely.
 * Uses a lock file + port-check for cross-process idempotency.
 * Graceful shutdown ensures no orphaned ports.
 */

process.env.MOCK_AI = 'true'

// Guard: only run server bootstrap for API test suites.
// Non-API suites (unit, e2e) must not trigger next start.
const isApiSuite = (() => {
  // test:api sets E2E_PORT / E2E_BASE_URL explicitly
  if (process.env.E2E_PORT) return true
  // Also accept a dedicated SKIP_API_SERVER guard (any truthy value skips)
  if (process.env.SKIP_API_SERVER) return false
  return false
})()

import { spawn } from 'child_process'
import { existsSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { ChildProcess } from 'child_process'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const PORT = process.env.E2E_PORT ?? '3000'
const SHOULD_BOOTSTRAP_API_SERVER = Boolean(process.env.E2E_PORT)
const LOCK_FILE = join(process.cwd(), '.jest_api_server.lock')

declare global {
  // eslint-disable-next-line no-var
  var __apiServerProc: ChildProcess | null | undefined
  // eslint-disable-next-line no-var
  var __apiServerReady: boolean | undefined
}

let serverProc: ChildProcess | null = null
let serverReady = false

const waitForServer = async (url: string, timeoutMs = 30000): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) })
      // Accept any non-5xx response as "server is reachable" — Next.js can
      // return redirects (301/302) or 404 on `/` in production mode, which
      // still means the server is up and handling requests.
      if (res.status < 500) return
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

const isPortInUse = async (port: string): Promise<boolean> => {
  try {
    const res = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
    })
    return res.ok
  } catch {
    return false
  }
}

const startServer = async (): Promise<void> => {
  if (globalThis.__apiServerReady) return

  // Always try to start a fresh server — we only skip if a real Next.js server
  // is already responding (not just a stale socket in TIME_WAIT).
  const portInUse = await isPortInUse(PORT)
  const alreadyNextJs = portInUse
    ? await isNextJsServerUp(PORT)
    : false

  if (alreadyNextJs) {
    // A compatible server is already running — use it.
    globalThis.__apiServerReady = true
    globalThis.__apiServerProc = null
    return
  }

  if (existsSync(LOCK_FILE)) {
    try { unlinkSync(LOCK_FILE) } catch { /* ignore */ }
  }

  serverProc = spawn('node', ['node_modules/.bin/next', 'start', '-p', PORT], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', PORT },
  })

  if (serverProc.pid) {
    writeFileSync(LOCK_FILE, String(serverProc.pid), 'utf8')
  }

  serverProc.on('error', () => {
    serverProc = null
    serverReady = false
    globalThis.__apiServerProc = null
    globalThis.__apiServerReady = false
    try { unlinkSync(LOCK_FILE) } catch { /* ignore */ }
  })

  serverProc.on('exit', () => {
    serverProc = null
    serverReady = false
    globalThis.__apiServerProc = null
    globalThis.__apiServerReady = false
    try { unlinkSync(LOCK_FILE) } catch { /* ignore */ }
  })

  await waitForServer(`${BASE}/`, 30000)
  serverReady = true
  globalThis.__apiServerProc = serverProc
  globalThis.__apiServerReady = true
}

/**
 * Verify an existing server on the port is actually a Next.js server (not a
 * stale socket from a previous process). Only returns true for genuine Next.js.
 */
const isNextJsServerUp = async (port: string): Promise<boolean> => {
  try {
    const res = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      signal: AbortSignal.timeout(2000),
    })
    // Any JSON response from /api/auth/login means Next.js is up and responding.
    const text = await res.text()
    try { JSON.parse(text); return true } catch { return false }
  } catch {
    return false
  }
}

const stopServer = async (): Promise<void> => {
  const proc = globalThis.__apiServerProc
  if (!proc) return

  // Try graceful SIGTERM first, give it 5s to exit cleanly
  try { proc.kill('SIGTERM') } catch { /* ignore */ }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      // Force kill if still alive after 5s
      try { proc.kill('SIGKILL') } catch { /* ignore */ }
      resolve()
    }, 5000)

    proc.on('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })

  globalThis.__apiServerProc = null
  globalThis.__apiServerReady = false

  try { unlinkSync(LOCK_FILE) } catch { /* ignore */ }

  // Extra settle time for port to become available again
  await new Promise(r => setTimeout(r, 800))
}

beforeAll(async () => {
  if (!isApiSuite) return
  await startServer()
}, 60000)

afterAll(async () => {
  if (!isApiSuite) return
  await stopServer()
}, 30000)