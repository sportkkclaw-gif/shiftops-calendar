# PRISMA_SCHEMA_SPEC.md — ShiftOps Calendar Prisma Schema 權威規格

updated_at: 2026-04-28T12:50:59+08:00
status: P0_patch_complete_user_gate_pending

## 0. 權威技術棧
本案以此為準：Next.js 15 App Router + TypeScript + PostgreSQL + Prisma。不得使用 Vite/Express 作為正式規格依據。

## 1. 必備 Models
以下為最低 Prisma model 清單，開發可擴充不可刪除；`CalendarCellDisplaySetting` 為月曆格班別自由呈現設定，不得省略：

```prisma
enum Role { ADMIN MANAGER MEMBER }
enum AssignmentType { REGULAR OVERTIME ON_CALL SPLIT_SEGMENT }
enum PreviewStatus { DRAFT APPLIED DISCARDED BLOCKED }
enum AlertStatus { GENERATED ACKNOWLEDGED RESOLVED ARCHIVED }
enum ExportStatus { PENDING PROCESSING COMPLETED FAILED EXPIRED }
enum OvertimeDisplayMode { HIDE BADGE CANDIDATES ASSIGNMENTS }

model User {
  id String @id @default(cuid())
  email String @unique
  passwordHash String
  role Role
  organizationId String
  organization Organization @relation(fields:[organizationId], references:[id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Organization {
  id String @id @default(cuid())
  name String
  locations Location[]
  users User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Location {
  id String @id @default(cuid())
  organizationId String
  name String
  timezone String @default("Asia/Taipei")
  organization Organization @relation(fields:[organizationId], references:[id])
}

model StaffProfile {
  id String @id @default(cuid())
  organizationId String
  locationId String
  userId String?
  name String
  email String?
  roleCode String
  color String
  active Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}


model CalendarCellDisplaySetting {
  id String @id @default(cuid())
  organizationId String
  locationId String?
  shiftTypeId String?
  patternType String?
  patternName String?
  label String
  shortLabel String
  color String
  glowColor String?
  textColor String?
  icon String?
  displayPriority Int @default(100)
  cellDensity String @default("standard")
  showStaffNames Boolean @default(true)
  showStaffCount Boolean @default(true)
  showCoverageBadge Boolean @default(true)
  showConflictBadge Boolean @default(true)
  showOvertimeBadge Boolean @default(true)
  overtimeDisplayMode OvertimeDisplayMode @default(BADGE)
  appliesTo Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ShiftType {
  id String @id @default(cuid())
  organizationId String
  locationId String
  name String
  code String
  color String
  startTime String?
  endTime String?
  durationMinutes Int?
  isAllDay Boolean @default(false)
  isOnCall Boolean @default(false)
  supportsSegments Boolean @default(false)
}

model ShiftRule {
  id String @id @default(cuid())
  organizationId String
  locationId String
  name String
  patternType String
  patternName String?
  patternConfig Json
  constraints Json
  priority Int @default(100)
  scopeFilter Json
  effectiveFrom DateTime
  effectiveUntil DateTime?
  active Boolean @default(true)
}

model ShiftRuleConstraint {
  id String @id @default(cuid())
  ruleId String
  category String
  key String
  operator String
  value Json
  weight Float?
  source String
}

model ShiftAssignment {
  id String @id @default(cuid())
  organizationId String
  locationId String
  date DateTime
  staffId String
  shiftTypeId String
  ruleId String?
  assignmentType AssignmentType @default(REGULAR)
  status String @default("confirmed")
  note String?
  applyRunId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ShiftAssignmentSegment {
  id String @id @default(cuid())
  assignmentId String
  segmentIndex Int
  startTime String
  endTime String
  breakMinutes Int @default(0)
  segmentType String @default("work")
}

model CalendarDayProjection {
  id String @id @default(cuid())
  organizationId String
  locationId String
  date DateTime
  ruleProjection Json
  assignmentSummary Json
  coverageStatus Json
  overtimeProjection Json
  displayState Json
  projectionHash String
  updatedAt DateTime @updatedAt
  @@unique([locationId, date])
}

model OvertimeCandidate {
  id String @id @default(cuid())
  organizationId String
  locationId String
  date DateTime
  targetShiftTypeId String
  staffId String
  sourceShiftTypeId String?
  reason String
  riskFlags Json
  score Float
  status String @default("candidate")
  createdAt DateTime @default(now())
}

model OvertimeAssignment {
  id String @id @default(cuid())
  organizationId String
  locationId String
  candidateId String?
  date DateTime
  staffId String
  targetShiftTypeId String
  assignmentId String?
  approvedBy String
  status String @default("confirmed")
  createdAt DateTime @default(now())
}

model StaffAvailabilityWindow {
  id String @id @default(cuid())
  staffId String
  startsAt DateTime
  endsAt DateTime
  availabilityType String // available/unavailable/preferred
  reason String?
}

model StaffSkillCertification {
  id String @id @default(cuid())
  staffId String
  skillCode String
  validFrom DateTime?
  validUntil DateTime?
}

model CoverageRequirement {
  id String @id @default(cuid())
  organizationId String
  locationId String
  shiftTypeId String
  weekday Int?
  date DateTime?
  minCount Int
  targetCount Int
  requiredSkills Json?
}

model CoverageAlert {
  id String @id @default(cuid())
  organizationId String
  locationId String
  date DateTime
  shiftTypeId String
  severity String
  status AlertStatus @default(GENERATED)
  message String
  details Json
  resolvedAt DateTime?
}

model SchedulePolicyProfile {
  id String @id @default(cuid())
  organizationId String
  locationId String?
  name String
  maxWeeklyMinutes Int?
  minRestMinutes Int?
  maxConsecutiveDays Int?
  rules Json
}

model NamedPatternSeed {
  id String @id @default(cuid())
  name String
  patternType String
  defaultConfig Json
  description String
}

model DemandForecast {
  id String @id @default(cuid())
  locationId String
  date DateTime
  shiftTypeId String
  demandValue Float
  suggestedStaffCount Int
  source String
}

model AISchedulePreview {
  id String @id @default(cuid())
  previewToken String @unique
  organizationId String
  locationId String
  dateRangeStart DateTime
  dateRangeEnd DateTime
  proposedAssignments Json
  calendarProjection Json
  warnings Json
  beforeSnapshot Json
  status PreviewStatus @default(DRAFT)
  createdBy String
  appliedAt DateTime?
}

model RuleApplyRun {
  id String @id @default(cuid())
  previewId String?
  organizationId String
  locationId String
  beforeSnapshot Json
  afterSnapshot Json
  affectedAssignmentIds Json
  status String
  appliedBy String
  createdAt DateTime @default(now())
}

model ExportJob {
  id String @id @default(cuid())
  organizationId String
  locationId String
  type String
  status ExportStatus @default(PENDING)
  options Json
  downloadUrl String?
  errorMessage String?
  expiresAt DateTime?
  createdBy String
  createdAt DateTime @default(now())
}

model AuditEvent {
  id String @id @default(cuid())
  organizationId String
  actorUserId String
  action String
  targetTable String
  targetId String?
  beforeSnapshot Json?
  afterSnapshot Json?
  metadata Json?
  createdAt DateTime @default(now())
}
```

## 2. Split shift 決策
採用一筆 `ShiftAssignment` + 多筆 `ShiftAssignmentSegment`。不得用單一 start/end 代表多段班。

## 3. Rollback 決策
以 `RuleApplyRun` 為 rollback 單位，restore `beforeSnapshot`，並檢查 affected records version/hash。

## 4. Export 決策
Export 必須用 `ExportJob` 非同步狀態，不能只做同步下載。
