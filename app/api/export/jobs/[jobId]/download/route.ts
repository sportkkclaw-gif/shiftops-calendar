import { NextRequest, NextResponse } from 'next/server'
import { getMockJob } from '@/lib/mock-job-store'

const CONTENT_TYPES: Record<string, string> = {
  PDF: 'application/pdf',
  PNG: 'image/png',
  ICS: 'text/calendar',
  CSV: 'text/csv',
}

const FILE_EXTENSIONS: Record<string, string> = {
  PDF: 'pdf',
  PNG: 'png',
  ICS: 'ics',
  CSV: 'csv',
}

/**
 * GET /api/export/jobs/[jobId]/download
 *
 * Returns the export artifact for the job.
 * In mock mode, generates a minimal valid artifact body based on job type.
 * Correct content-type and content-disposition headers are set.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    const mockMode = process.env.MOCK_AI === 'true'

    if (!mockMode) {
      return NextResponse.json(
        { error: { code: 'NOT_IMPLEMENTED', message: 'Real DB not configured' } },
        { status: 501 }
      )
    }

    const stored = getMockJob(jobId)

    if (!stored) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Export job '${jobId}' not found` } },
        { status: 404 }
      )
    }

    const type = stored.type ?? 'PDF'
    const ext = FILE_EXTENSIONS[type] ?? 'bin'
    const contentType = CONTENT_TYPES[type] ?? 'application/octet-stream'

    let body: string

    if (type === 'ICS') {
      // Minimal valid ICS calendar
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      body = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ShiftOps//MockExport//EN',
        'BEGIN:VEVENT',
        `DTSTART:${now}`,
        `DTEND:${now}`,
        'SUMMARY:Shift Schedule Export',
        `DESCRIPTION:Export job ${jobId}`,
        `UID:${jobId}@shiftops-mock`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n')
    } else if (type === 'PDF') {
      // Minimal valid PDF (header only — %PDF-1.4 placeholder)
      body = `%PDF-1.4\n1 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer << /Size 4 /Root 1 0 R >>\nstartxref\n194\n%%EOF`
    } else if (type === 'PNG') {
      // Minimal 1x1 PNG (single red pixel) — valid PNG signature + IHDR + IDAT + IEND
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR length + type
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 width/height
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT length + type
        0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, // compressed data
        0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xFE, 0xD4, // IDAT CRC
        0xEF, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND length + type
        0x44, 0xAE, 0x42, 0x60, 0x82, // IEND CRC
      ])
      const pngHeaders = new Headers()
      pngHeaders.set('Content-Type', contentType)
      pngHeaders.set(
        'Content-Disposition',
        `attachment; filename="shift-schedule-${jobId}.png"; filename*=UTF-8''${encodeURIComponent(`shift-schedule-${jobId}.png`)}`
      )
      return new Response(pngBytes.buffer, { status: 200, headers: pngHeaders })
    } else if (type === 'CSV') {
      body = 'date,staffId,shiftType\n2026-04-01,staff_1,st_morning\n'
    } else {
      body = `Mock export for job ${jobId} (type: ${type})`
    }

    const filename = `shift-schedule-${jobId}.${ext}`

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    )

    return new Response(body, { status: 200, headers })
  } catch (err) {
    console.error('[GET /api/export/jobs/[jobId]/download]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}