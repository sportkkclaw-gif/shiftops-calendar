-- Migration: initial_schema (baseline from existing db)
-- Created for migrate deploy path verification (I79)

-- CreateTable: User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: Organization
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: Location
CREATE TABLE IF NOT EXISTS "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Taipei'
);

-- CreateTable: StaffProfile
CREATE TABLE IF NOT EXISTS "StaffProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "roleCode" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: CalendarCellDisplaySetting
CREATE TABLE IF NOT EXISTS "CalendarCellDisplaySetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "shiftTypeId" TEXT,
    "patternType" TEXT,
    "patternName" TEXT,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "glowColor" TEXT,
    "textColor" TEXT,
    "icon" TEXT,
    "displayPriority" INTEGER NOT NULL DEFAULT 100,
    "cellDensity" TEXT NOT NULL DEFAULT 'standard',
    "showStaffNames" BOOLEAN NOT NULL DEFAULT true,
    "showStaffCount" BOOLEAN NOT NULL DEFAULT true,
    "showCoverageBadge" BOOLEAN NOT NULL DEFAULT true,
    "showConflictBadge" BOOLEAN NOT NULL DEFAULT true,
    "showOvertimeBadge" BOOLEAN NOT NULL DEFAULT true,
    "overtimeDisplayMode" TEXT NOT NULL DEFAULT 'BADGE',
    "appliesTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: ShiftType
CREATE TABLE IF NOT EXISTS "ShiftType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "durationMinutes" INTEGER,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "isOnCall" BOOLEAN NOT NULL DEFAULT false,
    "supportsSegments" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable: ShiftRule
CREATE TABLE IF NOT EXISTS "ShiftRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "patternName" TEXT,
    "patternConfig" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "scopeFilter" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveUntil" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable: ShiftRuleConstraint
CREATE TABLE IF NOT EXISTS "ShiftRuleConstraint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "weight" REAL,
    "source" TEXT NOT NULL
);

-- CreateTable: ShiftAssignment
CREATE TABLE IF NOT EXISTS "ShiftAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "staffId" TEXT NOT NULL,
    "shiftTypeId" TEXT NOT NULL,
    "ruleId" TEXT,
    "assignmentType" TEXT NOT NULL DEFAULT 'REGULAR',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "note" TEXT,
    "applyRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: ShiftAssignmentSegment
CREATE TABLE IF NOT EXISTS "ShiftAssignmentSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "segmentType" TEXT NOT NULL DEFAULT 'work'
);

-- CreateTable: CalendarDayProjection
CREATE TABLE IF NOT EXISTS "CalendarDayProjection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "ruleProjection" TEXT NOT NULL,
    "assignmentSummary" TEXT NOT NULL,
    "coverageStatus" TEXT NOT NULL,
    "overtimeProjection" TEXT NOT NULL,
    "displayState" TEXT NOT NULL,
    "projectionHash" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex: CalendarDayProjection location+date
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarDayProjection_locationId_date_key" ON "CalendarDayProjection"("locationId", "date");

-- CreateTable: OvertimeCandidate
CREATE TABLE IF NOT EXISTS "OvertimeCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "targetShiftTypeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "sourceShiftTypeId" TEXT,
    "reason" TEXT NOT NULL,
    "riskFlags" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: OvertimeAssignment
CREATE TABLE IF NOT EXISTS "OvertimeAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "candidateId" TEXT,
    "date" DATETIME NOT NULL,
    "staffId" TEXT NOT NULL,
    "targetShiftTypeId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "approvedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: StaffAvailabilityWindow
CREATE TABLE IF NOT EXISTS "StaffAvailabilityWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "availabilityType" TEXT NOT NULL,
    "reason" TEXT
);

-- CreateTable: StaffSkillCertification
CREATE TABLE IF NOT EXISTS "StaffSkillCertification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "validFrom" DATETIME,
    "validUntil" DATETIME
);

-- CreateTable: CoverageRequirement
CREATE TABLE IF NOT EXISTS "CoverageRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "shiftTypeId" TEXT NOT NULL,
    "weekday" INTEGER,
    "date" DATETIME,
    "minCount" INTEGER NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "requiredSkills" TEXT
);

-- CreateTable: CoverageAlert
CREATE TABLE IF NOT EXISTS "CoverageAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "shiftTypeId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "message" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "resolvedAt" DATETIME
);

-- CreateTable: SchedulePolicyProfile
CREATE TABLE IF NOT EXISTS "SchedulePolicyProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "maxWeeklyMinutes" INTEGER,
    "minRestMinutes" INTEGER,
    "maxConsecutiveDays" INTEGER,
    "rules" TEXT NOT NULL
);

-- CreateTable: NamedPatternSeed
CREATE TABLE IF NOT EXISTS "NamedPatternSeed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "defaultConfig" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable: DemandForecast
CREATE TABLE IF NOT EXISTS "DemandForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "shiftTypeId" TEXT NOT NULL,
    "demandValue" REAL NOT NULL,
    "suggestedStaffCount" INTEGER NOT NULL,
    "source" TEXT NOT NULL
);

-- CreateTable: AISchedulePreview
CREATE TABLE IF NOT EXISTS "AISchedulePreview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "previewToken" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dateRangeStart" DATETIME NOT NULL,
    "dateRangeEnd" DATETIME NOT NULL,
    "proposedAssignments" TEXT NOT NULL,
    "calendarProjection" TEXT NOT NULL,
    "warnings" TEXT NOT NULL,
    "beforeSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "appliedAt" DATETIME
);

-- CreateIndex: AISchedulePreview previewToken
CREATE UNIQUE INDEX IF NOT EXISTS "AISchedulePreview_previewToken_key" ON "AISchedulePreview"("previewToken");

-- CreateTable: RuleApplyRun
CREATE TABLE IF NOT EXISTS "RuleApplyRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "previewId" TEXT,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "beforeSnapshot" TEXT NOT NULL,
    "afterSnapshot" TEXT NOT NULL,
    "affectedAssignmentIds" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "appliedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: ExportJob
CREATE TABLE IF NOT EXISTS "ExportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "options" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "errorMessage" TEXT,
    "expiresAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: AuditEvent
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT,
    "beforeSnapshot" TEXT,
    "afterSnapshot" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: SwapRequest
CREATE TABLE IF NOT EXISTS "SwapRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "targetShiftTypeId" TEXT NOT NULL,
    "desiredPartnerId" TEXT,
    "desiredPartnerName" TEXT,
    "aiSuggestions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "managerId" TEXT,
    "managerComment" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: Holiday
CREATE TABLE IF NOT EXISTS "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: LunarDate
CREATE TABLE IF NOT EXISTS "LunarDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "lunarYear" INTEGER NOT NULL,
    "lunarMonth" INTEGER NOT NULL,
    "lunarDay" INTEGER NOT NULL,
    "solarDate" DATETIME,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'lunar',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: UserAiPreference
CREATE TABLE IF NOT EXISTS "UserAiPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "preferenceKey" TEXT NOT NULL,
    "preferenceJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex: UserAiPreference unique per user+org+key
CREATE UNIQUE INDEX IF NOT EXISTS "UserAiPreference_userId_organizationId_preferenceKey_key" ON "UserAiPreference"("userId", "organizationId", "preferenceKey");

-- FK: User -> Organization
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");

-- FK: Location -> Organization
CREATE INDEX IF NOT EXISTS "Location_organizationId_idx" ON "Location"("organizationId");

-- FK: StaffProfile -> Organization, Location
CREATE INDEX IF NOT EXISTS "StaffProfile_organizationId_idx" ON "StaffProfile"("organizationId");
CREATE INDEX IF NOT EXISTS "StaffProfile_locationId_idx" ON "StaffProfile"("locationId");

-- FK: ShiftType -> Organization, Location
CREATE INDEX IF NOT EXISTS "ShiftType_organizationId_idx" ON "ShiftType"("organizationId");
CREATE INDEX IF NOT EXISTS "ShiftType_locationId_idx" ON "ShiftType"("locationId");

-- FK: ShiftRule -> Organization, Location
CREATE INDEX IF NOT EXISTS "ShiftRule_organizationId_idx" ON "ShiftRule"("organizationId");
CREATE INDEX IF NOT EXISTS "ShiftRule_locationId_idx" ON "ShiftRule"("locationId");

-- FK: ShiftRuleConstraint -> ShiftRule
CREATE INDEX IF NOT EXISTS "ShiftRuleConstraint_ruleId_idx" ON "ShiftRuleConstraint"("ruleId");

-- FK: ShiftAssignment -> Organization, Location, Staff, ShiftType
CREATE INDEX IF NOT EXISTS "ShiftAssignment_organizationId_idx" ON "ShiftAssignment"("organizationId");
CREATE INDEX IF NOT EXISTS "ShiftAssignment_locationId_idx" ON "ShiftAssignment"("locationId");
CREATE INDEX IF NOT EXISTS "ShiftAssignment_staffId_idx" ON "ShiftAssignment"("staffId");
CREATE INDEX IF NOT EXISTS "ShiftAssignment_shiftTypeId_idx" ON "ShiftAssignment"("shiftTypeId");

-- FK: ShiftAssignmentSegment -> ShiftAssignment
CREATE INDEX IF NOT EXISTS "ShiftAssignmentSegment_assignmentId_idx" ON "ShiftAssignmentSegment"("assignmentId");

-- FK: CalendarDayProjection -> Location
CREATE INDEX IF NOT EXISTS "CalendarDayProjection_locationId_idx" ON "CalendarDayProjection"("locationId");

-- FK: OvertimeCandidate -> Organization, Location
CREATE INDEX IF NOT EXISTS "OvertimeCandidate_organizationId_idx" ON "OvertimeCandidate"("organizationId");
CREATE INDEX IF NOT EXISTS "OvertimeCandidate_locationId_idx" ON "OvertimeCandidate"("locationId");

-- FK: OvertimeAssignment -> Organization, Location
CREATE INDEX IF NOT EXISTS "OvertimeAssignment_organizationId_idx" ON "OvertimeAssignment"("organizationId");
CREATE INDEX IF NOT EXISTS "OvertimeAssignment_locationId_idx" ON "OvertimeAssignment"("locationId");

-- FK: SwapRequest -> Organization
CREATE INDEX IF NOT EXISTS "SwapRequest_organizationId_idx" ON "SwapRequest"("organizationId");

-- FK: AuditEvent -> Organization
CREATE INDEX IF NOT EXISTS "AuditEvent_organizationId_idx" ON "AuditEvent"("organizationId");

-- FK: ExportJob -> Organization, Location
CREATE INDEX IF NOT EXISTS "ExportJob_organizationId_idx" ON "ExportJob"("organizationId");
CREATE INDEX IF NOT EXISTS "ExportJob_locationId_idx" ON "ExportJob"("locationId");