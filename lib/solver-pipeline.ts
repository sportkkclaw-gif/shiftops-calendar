/**
 * Deterministic Solver Pipeline — I75 minimal implementation.
 *
 * Implements the pipeline from AI_SOLVER_SPEC.md §3:
 *   1. Normalize rules → per-day expected shifts
 *   2. Expand staff eligibility by role/skill/availability
 *   3. Fill required coverage (hard constraint)
 *   4. Score candidates (0..1) for soft constraint optimization
 *   5. Emit warnings for unmet hard/soft constraints
 *   6. Return SolverPreview-shaped output
 *
 * Exported:
 *   solve(input: SolverInput): SolverResult
 *   scoreCandidate(candidate, context): number
 *   SolverInput, SolverResult, SolverWarning, AssignmentDraft types
 */

import type { SolverPreview } from './types/solver-preview'

// ─── SolverInput (AI_SOLVER_SPEC.md §1) ─────────────────────────────────────

export interface StaffProfile {
  staffId: string
  name: string
  roleCode: string
  skills: string[]
  certifications: string[]
  maxHoursPerWeek?: number
}

export interface ShiftType {
  id: string
  name: string
  code: string
}

export interface SemanticRule {
  id: string
  name: string
  patternType: string // 'fixed_shift' | 'n_on_m_off' | 'ab_rotation' | 'named_pattern' | 'on_call' | ...
  patternConfig: Record<string, unknown> // { n?, m?, cycleDays?, name? }
  priority: number
  scopeFilter?: Record<string, unknown>
}

export interface Constraint {
  type: 'role' | 'skill' | 'certification' | 'availability' | 'policy'
  code: string
  label: string
  required: boolean
  // For availability constraints
  dateRange?: { start: string; end: string }
  shiftTypeId?: string
}

export interface AvailabilityWindow {
  staffId: string
  date: string // YYYY-MM-DD
  shiftTypeId: string
  available: boolean
  reason?: string
}

export interface SkillCertification {
  staffId: string
  code: string
  type: 'skill' | 'certification'
}

export interface CoverageRequirement {
  locationId: string
  shiftTypeId: string
  weekday?: number // 0=Sun..6=Sat
  date?: string
  minCount: number
}

export interface PolicyProfile {
  maxHoursPerWeek: number
  minRestHoursBetweenShifts: number
  maxConsecutiveDays: number
  weekendCoverageRequired: boolean
}

export interface DisplayPreferences {
  showOvertime: boolean
  compactMode: boolean
}

export interface SolverInput {
  organizationId: string
  locationId: string
  dateRange: { start: string; end: string }
  staff: StaffProfile[]
  shiftTypes: ShiftType[]
  semanticRules: SemanticRule[]
  constraints: Constraint[]
  availabilityWindows: AvailabilityWindow[]
  skillCertifications: SkillCertification[]
  coverageRequirements: CoverageRequirement[]
  existingAssignments: Array<{ staffId: string; date: string; shiftTypeId: string }>
  policyProfile: PolicyProfile
  displayPreferences: DisplayPreferences
}

// ─── Output types ─────────────────────────────────────────────────────────────

export type HardConstraintCode =
  | 'NO_STAFF_AVAILABLE'
  | 'CERTIFICATION_MISSING'
  | 'REST_VIOLATION'
  | 'MAX_HOURS_EXCEEDED'
  | 'CONSECUTIVE_DAYS_EXCEEDED'
  | 'UNMET_COVERAGE_MINIMUM'

export type SoftConstraintCode =
  | 'PREFERENCE_UNDERSERVED'
  | 'COVERAGE_GAP'
  | 'OVERTIME_CANDIDATE'

export interface SolverWarning {
  code: string
  message: string
  date?: string
  staffId?: string
  severity: 'hard' | 'soft'
}

export interface AssignmentDraft {
  id: string
  date: string
  staffId: string
  staffName: string
  shiftTypeId: string
  assignmentType: 'REGULAR' | 'OVERTIME'
  status: 'draft' | 'confirmed'
  score: number // 0..1
  ruleId: string | null
}

export interface CoverageAlertDraft {
  id: string
  date: string
  shiftTypeId: string
  severity: 'warning' | 'error'
  status: 'GENERATED' | 'ACKNOWLEDGED'
  message: string
  details: { required: number; actual: number }
}

export interface OvertimeCandidateDraft {
  id: string
  date: string
  targetShiftTypeId: string
  staffId: string
  score: number
  reason: string
  status: 'candidate' | 'confirmed'
}

export interface CalendarDayProjection {
  date: string
  weekday: number
  shiftCode: string
  label: string
  expectedStaff: number
  assignedStaff: number
  coverageStatus: 'adequate' | 'low' | 'partial'
}

export interface SolverResult {
  previewToken: string
  status: 'ready' | 'partial' | 'blocked'
  proposedAssignments: AssignmentDraft[]
  calendarProjection: CalendarDayProjection[]
  coverageAlerts: CoverageAlertDraft[]
  overtimeCandidates: OvertimeCandidateDraft[]
  warnings: SolverWarning[]
  explanation: string
  beforeSnapshotRef: string
}

// ─── Helper: phase label from pattern type ───────────────────────────────────

function phaseLabel(patternType: string, config: Record<string, unknown>, dayIndex: number): { shiftCode: string; label: string; shiftTypeId: string } {
  if (patternType === 'n_on_m_off') {
    const n = (config.n as number) || 3
    const m = (config.m as number) || 1
    const cycleLen = n + m
    const pos = dayIndex % cycleLen
    if (pos < n) return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
    return { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' }
  }
  if (patternType === 'ab_rotation') {
    return dayIndex % 2 === 0
      ? { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
      : { shiftCode: 'B', label: '午班', shiftTypeId: 'st_afternoon' }
  }
  if (patternType === 'named_pattern' || patternType === 'fixed_rotation') {
    // 2-2-3 sequence: A,A,B,B,OFF,OFF,OFF
    const seq = [0, 0, 1, 1, 2, 2, 2]
    const pos = seq[dayIndex % seq.length]
    if (pos === 0) return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
    if (pos === 1) return { shiftCode: 'B', label: '午班', shiftTypeId: 'st_afternoon' }
    return { shiftCode: 'OFF', label: '休息', shiftTypeId: 'st_off' }
  }
  if (patternType === 'on_call') return { shiftCode: 'OC', label: '待命', shiftTypeId: 'st_oncall' }
  if (patternType === 'split_shift') return { shiftCode: 'A', label: '分段班', shiftTypeId: 'st_morning' }
  if (patternType === 'compressed_week') return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
  // dupont / pitman → same 2-2-3 for minimal impl
  return { shiftCode: 'A', label: '早班', shiftTypeId: 'st_morning' }
}

// ─── Helper: compute eligible staff for a day ────────────────────────────────

function computeEligibility(
  input: SolverInput,
  date: string,
  shiftTypeId: string,
  assignedStaffIds: Set<string>
): StaffProfile[] {
  const dayOfWeek = new Date(date).getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  return input.staff.filter(staff => {
    // Already assigned today → skip
    if (assignedStaffIds.has(staff.staffId)) return false

    // Role constraint check
    const roleConstraints = input.constraints.filter(c => c.type === 'role' && c.required)
    for (const rc of roleConstraints) {
      if (staff.roleCode !== rc.code) return false
    }

    // Skill constraint check
    const skillConstraints = input.constraints.filter(c => c.type === 'skill' && c.required)
    for (const sc of skillConstraints) {
      if (!staff.skills.includes(sc.code)) return false
    }

    // Certification constraint check
    const certConstraints = input.constraints.filter(c => c.type === 'certification' && c.required)
    for (const cc of certConstraints) {
      if (!staff.certifications.includes(cc.code)) return false
    }

    // Availability window check
    const avail = input.availabilityWindows.find(
      w => w.staffId === staff.staffId && w.date === date && w.shiftTypeId === shiftTypeId
    )
    if (avail && !avail.available) return false

    // Max hours check (simplified — checks existingAssignments count)
    const staffAssignments = input.existingAssignments.filter(a => a.staffId === staff.staffId)
    if (staff.maxHoursPerWeek && staffAssignments.length >= staff.maxHoursPerWeek) return false

    // Policy: consecutive days check
    // Count consecutive assignments ending on date-1
    const recentDates = getRecentDates(date, input.policyProfile.maxConsecutiveDays)
    const consecutiveCount = recentDates.filter(d =>
      input.existingAssignments.some(a => a.staffId === staff.staffId && a.date === d)
    ).length
    if (consecutiveCount >= input.policyProfile.maxConsecutiveDays) return false

    return true
  })
}

/** Returns the N most recent dates before (and including) the given date. */
function getRecentDates(date: string, count: number): string[] {
  const result: string[] = []
  const cur = new Date(date)
  for (let i = 0; i < count; i++) {
    const d = new Date(cur)
    d.setDate(d.getDate() - i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

// ─── Score candidate (AI_SOLVER_SPEC.md §5) ───────────────────────────────────

export function scoreCandidate(
  staff: StaffProfile,
  context: {
    hasRequiredSkill: boolean
    hasRequiredRole: boolean
    isAvailable: boolean
    underHoursLimit: boolean
    restHoursSatisfied: boolean
    improvingFairness: boolean
    matchesPreference: boolean
  }
): number {
  let score = 0

  // +0.30 — skill/role match
  if (context.hasRequiredSkill || context.hasRequiredRole) score += 0.30

  // +0.20 — availability
  if (context.isAvailable) score += 0.20

  // +0.15 — under hours limit
  if (context.underHoursLimit) score += 0.15

  // +0.15 — rest interval satisfied
  if (context.restHoursSatisfied) score += 0.15

  // +0.10 — improving fairness
  if (context.improvingFairness) score += 0.10

  // +0.10 — matches preference
  if (context.matchesPreference) score += 0.10

  return Math.min(score, 1.0)
}

// ─── Core solve() ─────────────────────────────────────────────────────────────

function generateToken(): string {
  return `preview_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function solve(input: SolverInput): SolverResult {
  const token = generateToken()
  const warnings: SolverWarning[] = []
  const assignments: AssignmentDraft[] = []
  const coverageAlerts: CoverageAlertDraft[] = []
  const overtimeCandidates: OvertimeCandidateDraft[] = []
  const calendarProjection: CalendarDayProjection[] = []

  // Parse date range
  const start = new Date(input.dateRange.start)
  const end = new Date(input.dateRange.end)

  // Active rules (sorted by priority)
  const activeRules = input.semanticRules
    .filter(r => !r.scopeFilter || !(r.scopeFilter as Record<string, unknown>).locationId || (r.scopeFilter as Record<string, unknown>).locationId === input.locationId)
    .sort((a, b) => a.priority - b.priority)

  // Build per-day projections
  const numDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const anchorDate = new Date(start)

  // Map date → assigned staff IDs (mutable)
  const assignedByDate = new Map<string, Set<string>>()
  // Pre-populate with existing assignments
  for (const a of input.existingAssignments) {
    if (!assignedByDate.has(a.date)) assignedByDate.set(a.date, new Set())
    assignedByDate.get(a.date)!.add(a.staffId)
  }

  // Required coverage per location per day
  const coverageReqMap = new Map<string, number>() // "loc_date_shiftTypeId" → minCount

  for (const req of input.coverageRequirements) {
    const key = `${req.locationId}_${req.shiftTypeId}`
    coverageReqMap.set(key, (coverageReqMap.get(key) ?? 0) + req.minCount)
  }

  // ── Step 1 & 2: Project expected shifts per day ─────────────────────────────
  for (let d = 0; d < numDays; d++) {
    const date = new Date(start)
    date.setDate(start.getDate() + d)
    const dateStr = date.toISOString().slice(0, 10)
    const dayIndex = d % (input.semanticRules[0]?.patternConfig?.cycleDays as number ?? 7)

    // Update assignedByDate with assignments already made for this date
    if (!assignedByDate.has(dateStr)) assignedByDate.set(dateStr, new Set())

    // Compute expected shifts from rules
    for (const rule of activeRules) {
      const phase = phaseLabel(rule.patternType, rule.patternConfig ?? {}, dayIndex)
      if (phase.shiftCode === 'OFF') continue // skip OFF days

      const requiredMin = coverageReqMap.get(`${input.locationId}_${phase.shiftTypeId}`) ?? 1
      const alreadyAssigned = assignedByDate.get(dateStr)!.size
      const shortfall = Math.max(0, requiredMin - alreadyAssigned)

      // Compute eligibility
      const eligible = computeEligibility(input, dateStr, phase.shiftTypeId, assignedByDate.get(dateStr)!)

      // ── Hard constraint: met minimum coverage ────────────────────────────
      if (shortfall > 0 && eligible.length === 0) {
        warnings.push({
          code: 'NO_STAFF_AVAILABLE',
          message: `${dateStr} 班別 (${phase.label}) 需要 ${requiredMin} 人，但無可用人員`,
          date: dateStr,
          severity: 'hard',
        })
        coverageAlerts.push({
          id: `alert_${dateStr}_${phase.shiftTypeId}`,
          date: dateStr,
          shiftTypeId: phase.shiftTypeId,
          severity: 'error',
          status: 'GENERATED',
          message: `${dateStr} 班別覆蓋人數低於目標（需要 ${requiredMin} 人）`,
          details: { required: requiredMin, actual: alreadyAssigned },
        })
      }

      // ── Fill shortfall with best available staff ─────────────────────────
      let filled = alreadyAssigned
      for (const staff of eligible) {
        if (filled >= requiredMin) break

        // Score the candidate
        const constraintContext = {
          hasRequiredSkill: staff.skills.length > 0 && input.constraints.some(c => c.type === 'skill' && c.required && staff.skills.includes(c.code)),
          hasRequiredRole: input.constraints.some(c => c.type === 'role' && c.required && staff.roleCode === c.code),
          isAvailable: !input.availabilityWindows.some(w => w.staffId === staff.staffId && w.date === dateStr && !w.available),
          underHoursLimit: !staff.maxHoursPerWeek || input.existingAssignments.filter(a => a.staffId === staff.staffId).length < staff.maxHoursPerWeek,
          restHoursSatisfied: true, // simplified — real impl checks last shift end time
          improvingFairness: true,    // simplified — real impl would track variance
          matchesPreference: true,    // simplified — preference not modeled in minimal impl
        }
        const candidateScore = scoreCandidate(staff, constraintContext)

        // Hard block: score 0 → candidate invalid (e.g. no required skill when required)
        if (candidateScore === 0 && input.constraints.some(c => c.required && (c.type === 'skill' || c.type === 'certification') && !staff.skills.includes(c.code) && !staff.certifications.includes(c.code))) {
          warnings.push({
            code: 'CERTIFICATION_MISSING',
            message: `${staff.name} 缺少必要技能/證照`,
            date: dateStr,
            staffId: staff.staffId,
            severity: 'hard',
          })
          continue
        }

        assignments.push({
          id: `draft_${dateStr}_${staff.staffId}_${Math.random().toString(36).slice(2, 6)}`,
          date: dateStr,
          staffId: staff.staffId,
          staffName: staff.name,
          shiftTypeId: phase.shiftTypeId,
          assignmentType: 'REGULAR',
          status: 'draft',
          score: candidateScore,
          ruleId: rule.id,
        })

        assignedByDate.get(dateStr)!.add(staff.staffId)
        filled++
      }

      // After fill attempt, check if shortfall remains
      const stillShort = requiredMin - assignedByDate.get(dateStr)!.size
      if (stillShort > 0) {
        coverageAlerts.push({
          id: `alert_${dateStr}_${phase.shiftTypeId}`,
          date: dateStr,
          shiftTypeId: phase.shiftTypeId,
          severity: 'warning',
          status: 'GENERATED',
          message: `${dateStr} 班別覆蓋人數低於目標（需要 ${requiredMin} 人，缺 ${stillShort} 人）`,
          details: { required: requiredMin, actual: assignedByDate.get(dateStr)!.size },
        })
        warnings.push({
          code: 'UNMET_COVERAGE_MINIMUM',
          message: `${dateStr} 仍缺 ${stillShort} 人`,
          date: dateStr,
          severity: 'soft',
        })

        // Generate OT candidates
        const remainingEligible = eligible.filter(s => !assignedByDate.get(dateStr)!.has(s.staffId))
        for (const staff of remainingEligible.slice(0, 3)) {
          overtimeCandidates.push({
            id: `otc_${dateStr}_${staff.staffId}_${Math.random().toString(36).slice(2, 6)}`,
            date: dateStr,
            targetShiftTypeId: phase.shiftTypeId,
            staffId: staff.staffId,
            score: 0.75,
            reason: '補班候選人，技能符合且未達上限',
            status: 'candidate',
          })
        }
      }

      // Build calendar projection for this day+rule
      calendarProjection.push({
        date: dateStr,
        weekday: date.getDay(),
        shiftCode: phase.shiftCode,
        label: phase.label,
        expectedStaff: requiredMin,
        assignedStaff: assignedByDate.get(dateStr)!.size,
        coverageStatus: assignedByDate.get(dateStr)!.size >= requiredMin ? 'adequate' : assignedByDate.get(dateStr)!.size > 0 ? 'partial' : 'low',
      })
    }
  }

  // ── Status determination ──────────────────────────────────────────────────
  const hardWarnings = warnings.filter(w => w.severity === 'hard')
  const status: SolverResult['status'] = hardWarnings.length > 0
    ? 'blocked'
    : warnings.filter(w => w.severity === 'soft').length > 0
    ? 'partial'
    : 'ready'

  // ── Explanation ────────────────────────────────────────────────────────────
  const explanation = `Solver 已處理 ${assignments.length} 筆排班提議，涵蓋 ${calendarProjection.length} 個工作天。` +
    (hardWarnings.length > 0 ? ` 阻塞問題：${hardWarnings.map(w => w.message).join('; ')}` : '') +
    (warnings.filter(w => w.severity === 'soft').length > 0 ? ` 警示：${warnings.filter(w => w.severity === 'soft').map(w => w.message).join('; ')}` : '')

  return {
    previewToken: token,
    status,
    proposedAssignments: assignments,
    calendarProjection,
    coverageAlerts,
    overtimeCandidates,
    warnings,
    explanation: explanation.trim(),
    beforeSnapshotRef: `snap_${token}`,
  }
}