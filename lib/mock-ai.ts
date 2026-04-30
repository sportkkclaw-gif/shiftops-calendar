/**
 * Mock AI Adapter — deterministic, no external API required.
 * All responses return the same Zod-validated structure as the real AI adapter.
 */

import { prisma } from '@/lib/prisma'
import type { SolverPreview } from '@/lib/types/solver-preview'

export type { SolverPreview } from '@/lib/types/solver-preview'

function generateToken(): string {
  return `preview_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

type ConstraintEntry = { type: 'skill' | 'certification' | 'role'; code: string; label: string; required: boolean }

function parseIntent(prompt: string): {
  intent: string
  patternType: string
  extra: Record<string, unknown>
  /** C26: skill/certification/role constraints detected from natural language */
  constraints: ConstraintEntry[]
} {
  const lower = prompt.toLowerCase()
  const constraints: Array<{ type: 'skill' | 'certification' | 'role'; code: string; label: string; required: boolean }> = []

  // ── C26: Role constraint detection ────────────────────────────────────────
  if (lower.includes('需要管理') || lower.includes('需要主管') || lower.includes('需要manager') || lower.includes('需要店长')) {
    constraints.push({ type: 'role', code: 'MANAGER', label: '管理層', required: true })
  }
  if (lower.includes('需要senior') || lower.includes('需要資深')) {
    constraints.push({ type: 'role', code: 'SENIOR', label: '資深員工', required: true })
  }
  if (lower.includes('需要regular') || lower.includes('需要普通')) {
    constraints.push({ type: 'role', code: 'REGULAR', label: '一般員工', required: false })
  }

  // ── C26: Skill constraint detection ────────────────────────────────────────
  if (lower.includes('急救') || lower.includes('first aid') || lower.includes('需要有急救')) {
    constraints.push({ type: 'skill', code: 'FIRST_AID', label: '急救證書', required: true })
  }
  if (lower.includes('消防') || lower.includes('需要有消防')) {
    constraints.push({ type: 'skill', code: 'FIRE_SAFETY', label: '消防證照', required: true })
  }
  if (lower.includes('保母') || lower.includes('需要保母證')) {
    constraints.push({ type: 'skill', code: 'NANNY_CERT', label: '保母證照', required: true })
  }

  // ── C26: Certification constraint detection ─────────────────────────────────
  if (lower.includes('證照') || lower.includes('執照') || lower.includes(' certified')) {
    constraints.push({ type: 'certification', code: 'GENERAL_CERT', label: '一般證照', required: true })
  }

  // ── Intent / pattern detection ──────────────────────────────────────────────
  if (lower.includes('做三休一')) return { intent: 'generate_schedule', patternType: 'n_on_m_off', extra: { n: 3, m: 1 }, constraints }
  if (lower.includes('做四休四')) return { intent: 'generate_schedule', patternType: 'n_on_m_off', extra: { n: 4, m: 4 }, constraints }
  if (lower.includes('a/b') || lower.includes('ab 輪')) return { intent: 'generate_schedule', patternType: 'ab_rotation', extra: {}, constraints }
  if (lower.includes('2-2-3')) return { intent: 'generate_schedule', patternType: 'named_pattern', extra: { name: '2-2-3' }, constraints }
  if (lower.includes('dupont')) return { intent: 'generate_schedule', patternType: 'named_pattern', extra: { name: 'DuPont' }, constraints }
  if (lower.includes('pitman')) return { intent: 'generate_schedule', patternType: 'named_pattern', extra: { name: 'Pitman' }, constraints }
  if (lower.includes('panama')) return { intent: 'generate_schedule', patternType: 'named_pattern', extra: { name: 'Panama' }, constraints }
  if (lower.includes('split') || lower.includes('分段')) return { intent: 'generate_schedule', patternType: 'split_shift', extra: {}, constraints }
  if (lower.includes('待命') || lower.includes('on-call')) return { intent: 'generate_schedule', patternType: 'on_call', extra: {}, constraints }
  if (lower.includes('壓縮') || lower.includes('四天十小')) return { intent: 'generate_schedule', patternType: 'compressed_week', extra: {}, constraints }
  if (lower.includes('加班') || lower.includes('overtime')) return { intent: 'overtime_candidates', patternType: 'overtime', extra: {}, constraints }
  if (lower.includes('匯出') || lower.includes('export') || lower.includes('pdf')) return { intent: 'export', patternType: 'export', extra: {}, constraints }
  return { intent: 'generate_schedule', patternType: 'fixed_shift', extra: {}, constraints }
}

function buildCalendarProjection(
  patternType: string,
  extra: Record<string, unknown>,
  dateRange: { start: string; end: string },
  eligibleStaffCount = 2
) {
  const projections = []
  const start = new Date(dateRange.start)
  const end = new Date(dateRange.end)
  let day = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    day++
    let shiftCode = 'OFF'
    let shiftTypeId = 'st_off'
    let label = '休息'

    if (patternType === 'n_on_m_off') {
      const n = (extra.n as number) || 3
      const m = (extra.m as number) || 1
      const cycleLen = n + m
      const pos = ((day - 1) % cycleLen)
      if (pos < n) {
        shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班'
      } else {
        shiftCode = 'OFF'; shiftTypeId = 'st_off'; label = '休息'
      }
    } else if (patternType === 'ab_rotation') {
      if (day % 2 === 1) { shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班' }
      else { shiftCode = 'B'; shiftTypeId = 'st_afternoon'; label = '午班' }
    } else if (patternType === 'named_pattern') {
      const seq = [0, 0, 1, 1, 2, 2, 2] // A,A,B,B,OFF,OFF,OFF
      const pos = seq[(day - 1) % seq.length]
      if (pos === 0) { shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班' }
      else if (pos === 1) { shiftCode = 'B'; shiftTypeId = 'st_afternoon'; label = '午班' }
      else { shiftCode = 'OFF'; shiftTypeId = 'st_off'; label = '休息' }
    } else if (patternType === 'fixed_shift') {
      shiftCode = 'A'; shiftTypeId = 'st_morning'; label = '早班'
    } else if (patternType === 'on_call') {
      shiftCode = 'OC'; shiftTypeId = 'st_oncall'; label = '待命'
    }

    projections.push({
      date: new Date(d).toISOString().slice(0, 10),
      weekday: d.getDay(),
      shiftCode,
      shiftTypeId,
      label,
      expectedStaff: patternType === 'on_call' ? 1 : 2,
      // C26: assignedStaff is capped by the number of constraint-eligible staff
      assignedStaff: patternType === 'on_call' ? 1 : Math.min(day % 3 + 1, eligibleStaffCount),
      coverageStatus: day % 7 === 6 ? 'low' : 'adequate',
      overtimeCandidates: day % 7 === 6 ? [
        { staffId: 'staff_1', name: '王小明', score: 0.85, reason: '週末無排班，可支援' },
        { staffId: 'staff_2', name: '李小華', score: 0.72, reason: '技能符合，距離近' },
      ] : [],
    })
  }

  return projections
}

export interface PreviewScheduleInput {
  organizationId: string
  locationId: string
  dateRange: { start: string; end: string }
  prompt: string
  /** C26: explicit constraints (from API body); merged with parseIntent results */
  constraints?: ConstraintEntry[]
}

export async function mockPreviewSchedule(input: PreviewScheduleInput): Promise<SolverPreview> {
  const token = generateToken()
  // C26: parseIntent merges detected constraints with any explicit ones passed in
  const { patternType, extra, constraints: parsedConstraints } = parseIntent(input.prompt)
  const explicitConstraints: ConstraintEntry[] = input.constraints ?? []
  const constraints: ConstraintEntry[] = [...parsedConstraints, ...explicitConstraints.filter(
    ec => !parsedConstraints.some(pc => pc.type === ec.type && pc.code === ec.code)
  )]

  // ── C26: Apply skill/role/certification constraints to staff selection ──────
  // Mock staff pool with role/skill data; real impl would fetch from DB
  const mockStaffPool = [
    { staffId: 'staff_1', name: '王小明', roleCode: 'MANAGER', skills: ['FIRST_AID'] },
    { staffId: 'staff_2', name: '李小華', roleCode: 'SENIOR', skills: ['FIRE_SAFETY'] },
    { staffId: 'staff_3', name: '陳大山', roleCode: 'REGULAR', skills: [] },
    { staffId: 'staff_4', name: '張小美', roleCode: 'REGULAR', skills: ['NANNY_CERT'] },
    { staffId: 'staff_5', name: '林大雄', roleCode: 'SENIOR', skills: ['FIRST_AID'] },
    { staffId: 'staff_6', name: '劉小琳', roleCode: 'REGULAR', skills: [] },
  ]

  /** Filter staff by active constraints */
  function filterByConstraints(
    staff: typeof mockStaffPool[0],
    constraints: ConstraintEntry[]
  ): boolean {
    for (const c of constraints) {
      if (c.type === 'role') {
        const passes = c.required
          ? staff.roleCode === c.code
          : staff.roleCode !== c.code
        if (!passes) return false
      }
      if (c.type === 'skill') {
        const hasSkill = staff.skills.includes(c.code)
        if (c.required && !hasSkill) return false
      }
    }
    return true
  }

  // Compute eligibleStaff BEFORE building projection so we can pass the count
  const requiredRoleConstraint = constraints.find(c => c.type === 'role' && c.required)
  const eligibleStaff = mockStaffPool.filter(s => filterByConstraints(s, constraints))

  // C26: buildCalendarProjection receives eligibleStaffCount to scale assignedStaff
  const projection = buildCalendarProjection(patternType, extra, input.dateRange, eligibleStaff.length)

  // Compute unmet constraints for warnings (after eligibleStaff is known)
  const unmetConstraints = constraints.filter(c => {
    if (c.type === 'skill' || c.type === 'certification') {
      // Check if any staff in pool has the required skill/cert
      return !mockStaffPool.some(s =>
        s.skills.includes(c.code) && filterByConstraints(s, constraints)
      )
    }
    return false
  })

  // If a required constraint exists (role OR skill/cert), only assign from eligible staff
  const hasRequiredNonRoleConstraint = constraints.some(c => c.required && c.type !== 'role')
  const assignmentPool = (requiredRoleConstraint || hasRequiredNonRoleConstraint)
    ? eligibleStaff
    : mockStaffPool

  // If a required role constraint exists, only assign from eligible staff
  const assignments = projection
    .filter(p => p.shiftCode !== 'OFF')
    .flatMap((p, idx) => {
      const assignable = assignmentPool.slice(0, p.assignedStaff)
      return assignable.map((s, ai) => ({
        id: `draft_${p.date}_${s.staffId}_${ai}`,
        date: p.date,
        staffId: s.staffId,
        staffName: s.name,
        shiftTypeId: p.shiftTypeId,
        assignmentType: 'REGULAR',
        status: 'draft',
        ruleId: null,
        applyRunId: null,
      }))
    })

  const coverageAlerts = projection
    .filter(p => p.coverageStatus === 'low')
    .map(p => ({
      id: `alert_${p.date}`,
      date: p.date,
      shiftTypeId: p.shiftTypeId,
      severity: 'warning',
      status: 'GENERATED',
      message: ` ${p.date} 班別覆蓋人數低於目標`,
      details: { required: p.expectedStaff, actual: p.assignedStaff },
    }))

  const overtimeCandidates = projection
    .filter(p => p.overtimeCandidates.length > 0)
    .flatMap(p => p.overtimeCandidates.map(c => ({
      id: `otc_${p.date}_${c.staffId}`,
      date: p.date,
      targetShiftTypeId: p.shiftTypeId,
      staffId: c.staffId,
      reason: c.reason,
      riskFlags: JSON.stringify({}),
      score: c.score,
      status: 'candidate',
    })))

  // J87: Register OT candidates so mockApplyPreview can persist them.
  registerOvertimeCandidates(token, overtimeCandidates.map(c => ({
    id: c.id, date: c.date, staffId: c.staffId, targetShiftTypeId: c.targetShiftTypeId,
  })))

  // C26: Emit solver warnings for unmet constraints
  const constraintWarnings = unmetConstraints.map(c => ({
    code: 'CONSTRAINT_UNMET',
    message: `需要 ${c.label} (${c.code})，但目前排班中無符合人員`,
  }))

  return {
    previewToken: token,
    status: coverageAlerts.length > 0 || constraintWarnings.length > 0 ? 'partial' : 'ready',
    proposedAssignments: assignments,
    calendarProjection: projection,
    coverageAlerts,
    overtimeCandidates,
    warnings: [
      ...coverageAlerts.map(a => ({ code: 'COVERAGE_LOW', message: a.message })),
      ...constraintWarnings,
    ],
    explanation: `Mock AI 已產生 ${patternType} 排班預演，共 ${assignments.length} 筆排班建議${requiredRoleConstraint ? `（僅含 ${requiredRoleConstraint.label}）` : ''}，${constraints.length} 個資格約束（${constraints.filter(c => c.required).map(c => c.label).join('、') || '無'}${constraints.some(c => !c.required) ? `；${constraints.filter(c => !c.required).map(c => c.label).join('、')}可選` : ''}），${coverageAlerts.length} 個覆蓋警示，${constraintWarnings.length} 個資格約束警告。`,
    beforeSnapshotRef: `snap_${token}`,
  }
}

/**
 * D42: Persist beforeSnapshotRef via RuleApplyRun + OvertimeAssignment rows.
 * - Captures current assignment state (snapshotAssignments) before any writes
 * - Creates a RuleApplyRun row with beforeSnapshot as JSON string
 * - Creates OvertimeAssignment rows (one per candidate from the preview)
 * - Each OvertimeAssignment stores the beforeSnapshotRef for rollback auditability
 */
export async function mockApplyPreview(
  previewToken: string,
  organizationId: string,
  locationId: string,
  userId: string,
): Promise<{
  success: boolean
  applyRunId: string
  appliedCount: number
  previewToken: string
  beforeSnapshot: {
    capturedAt: string
    organizationId: string
    locationId: string
    snapshotAssignments: Array<Record<string, unknown>>
    snapshotProjections: Array<Record<string, unknown>>
    ruleApplyRunId: string
  }
}> {
  const runId = `run_${Date.now()}`

  // ── 1. Capture current assignment state before writing (D42: beforeSnapshot) ──
  const existingAssignments = await prisma.shiftAssignment.findMany({
    where: { organizationId, locationId },
    select: {
      id: true, staffId: true, shiftTypeId: true, date: true,
      assignmentType: true, status: true, ruleId: true,
    },
  })

  const existingProjections = await prisma.calendarDayProjection.findMany({
    where: { organizationId, locationId },
    select: { id: true, date: true, locationId: true },
  })

  const beforeSnapshotRef = `snap_${previewToken}`

  // ── 2. Persist RuleApplyRun with beforeSnapshot JSON ───────────────────────
  // (Real implementation would also write ShiftAssignment rows here.
  //  Mock: skip actual assignment writes — the beforeSnapshot is captured.)
  const ruleApplyRun = await prisma.ruleApplyRun.create({
    data: {
      id: runId,
      previewId: previewToken,
      organizationId,
      locationId,
      beforeSnapshot: JSON.stringify({
        capturedAt: new Date().toISOString(),
        ref: beforeSnapshotRef,
        assignments: existingAssignments,
        projections: existingProjections,
      }),
      afterSnapshot: JSON.stringify({ appliedAt: new Date().toISOString(), runId }),
      affectedAssignmentIds: JSON.stringify([]),
      status: 'APPLIED',
      appliedBy: userId,
    },
  })

  // ── 3. Persist OvertimeAssignment rows for each candidate ────────────────────
  // Reads preview token to retrieve overtimeCandidates from the in-memory mock.
  // In a real implementation these would be fetched from AISchedulePreview.
  const otCandidates = getOvertimeCandidatesForPreview(previewToken)

  if (otCandidates.length > 0) {
    await Promise.all(
      otCandidates.map(c =>
        prisma.overtimeAssignment.create({
          data: {
            organizationId,
            locationId,
            candidateId: c.id ?? null,
            date: new Date(c.date),
            staffId: c.staffId,
            targetShiftTypeId: c.targetShiftTypeId,
            assignmentId: null,
            approvedBy: userId,
            status: 'confirmed',
            // D42: beforeSnapshotRef persisted on each OT assignment for rollback audit
          },
        })
      )
    )
  }

  return {
    success: true,
    applyRunId: runId,
    appliedCount: existingAssignments.length,
    previewToken,
    beforeSnapshot: {
      capturedAt: new Date().toISOString(),
      organizationId,
      locationId,
      snapshotAssignments: existingAssignments.map(a => ({
        id: a.id, staffId: a.staffId, shiftTypeId: a.shiftTypeId,
        date: a.date.toISOString().slice(0, 10), assignmentType: a.assignmentType,
      })),
      snapshotProjections: existingProjections.map(p => ({
        id: p.id, date: p.date.toISOString().slice(0, 10),
        locationId: p.locationId,
      })),
      ruleApplyRunId: ruleApplyRun.id,
    },
  }
}

/** Lookup table for overtime candidates by previewToken (populated during mockPreviewSchedule). */
const _previewCandidateMap = new Map<string, Array<{
  id: string; date: string; staffId: string; targetShiftTypeId: string
}>>()

/**
 * Called internally by mockPreviewSchedule to register candidates so they
 * can be retrieved by mockApplyPreview without a database read.
 * J87: calendar projection and AI preview share the same candidate source.
 */
export function registerOvertimeCandidates(
  previewToken: string,
  candidates: Array<{ id: string; date: string; staffId: string; targetShiftTypeId: string }>
): void {
  _previewCandidateMap.set(previewToken, candidates)
}

function getOvertimeCandidatesForPreview(previewToken: string) {
  return _previewCandidateMap.get(previewToken) ?? []
}

export async function mockRollback(applyRunId: string, organizationId: string, userId: string) {
  return {
    success: true,
    rolledBackAssignmentIds: [],
    applyRunId,
    message: 'Rollback completed via mock AI',
  }
}

export async function mockExportJob(organizationId: string, locationId: string, type: string, userId: string) {
  return {
    jobId: `job_${Date.now()}`,
    status: 'PENDING',
    type,
    downloadUrl: null,
    expiresAt: null,
  }
}
