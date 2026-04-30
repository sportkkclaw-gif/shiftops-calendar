/**
 * SolverPreview — shared contract type exported from AI_SOLVER_SPEC.md §6.
 * Single source of truth used by:
 *   - lib/mock-ai.ts (mockPreviewSchedule return type)
 *   - app/api/ai/preview-schedule/route.ts (API response)
 *   - app/api/calendar/projection/route.ts (calendar reads same projection shape)
 *   - app/api/ai/apply-preview/route.ts (consumes beforeSnapshotRef)
 */

import { z } from 'zod'

export const SolverPreviewSchema = z.object({
  previewToken: z.string(),
  status: z.enum(['ready', 'partial', 'blocked']),
  proposedAssignments: z.array(z.any()),
  calendarProjection: z.array(z.any()),
  coverageAlerts: z.array(z.any()),
  overtimeCandidates: z.array(z.any()),
  warnings: z.array(z.any()),
  explanation: z.string(),
  beforeSnapshotRef: z.string(),
})

export type SolverPreview = z.infer<typeof SolverPreviewSchema>
