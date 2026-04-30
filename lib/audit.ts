/**
 * Audit helper — writes AuditEvent rows for AI action routes.
 * Used by: preview-schedule, apply-preview, rollback, export-command.
 */

import { prisma } from '@/lib/prisma'

export interface AuditMeta {
  organizationId: string
  actorUserId: string
  action: string
  targetTable: string
  targetId?: string | null
  beforeSnapshot?: unknown
  afterSnapshot?: unknown
  extra?: Record<string, unknown>
}

/**
 * Write one AuditEvent row. Silently swallows errors so audit failures
 * never break the primary API response.
 */
export async function writeAuditEvent(meta: AuditMeta): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: meta.organizationId,
        actorUserId: meta.actorUserId,
        action: meta.action,
        targetTable: meta.targetTable,
        targetId: meta.targetId ?? null,
        beforeSnapshot: meta.beforeSnapshot != null ? JSON.stringify(meta.beforeSnapshot) : null,
        afterSnapshot: meta.afterSnapshot != null ? JSON.stringify(meta.afterSnapshot) : null,
        metadata: meta.extra ? JSON.stringify(meta.extra) : null,
      },
    })
  } catch (err) {
    // Log but never throw — audit is best-effort
    console.warn('[writeAuditEvent] failed to persist audit row:', err)
  }
}
