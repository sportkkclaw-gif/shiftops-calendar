export const previewStaff = [
  { id: 'staff_1', organizationId: 'org_demo', locationId: 'loc_demo', name: '王小明', email: 'xiaoming@corp.com', roleCode: 'MANAGER', color: '#3B82F6', active: true },
  { id: 'staff_2', organizationId: 'org_demo', locationId: 'loc_demo', name: '李小華', email: 'xiaohua@corp.com', roleCode: 'SENIOR', color: '#10B981', active: true },
  { id: 'staff_3', organizationId: 'org_demo', locationId: 'loc_demo', name: '陳大山', email: 'dashan@corp.com', roleCode: 'REGULAR', color: '#F59E0B', active: true },
  { id: 'staff_4', organizationId: 'org_demo', locationId: 'loc_demo', name: '張小美', email: 'xiaomei@corp.com', roleCode: 'REGULAR', color: '#EF4444', active: true },
  { id: 'staff_5', organizationId: 'org_demo', locationId: 'loc_demo', name: '林大雄', email: 'daxiong@corp.com', roleCode: 'SENIOR', color: '#8B5CF6', active: true },
  { id: 'staff_6', organizationId: 'org_demo', locationId: 'loc_demo', name: '劉小琳', email: 'xiaolin@corp.com', roleCode: 'REGULAR', color: '#EC4899', active: true },
]

export const previewShiftTypes = [
  { id: 'st_morning', organizationId: 'org_demo', locationId: 'loc_demo', name: '早班', code: 'A', color: '#3B82F6', startTime: '09:00', endTime: '17:00', durationMinutes: 480, isAllDay: false, isOnCall: false, supportsSegments: false },
  { id: 'st_afternoon', organizationId: 'org_demo', locationId: 'loc_demo', name: '午班', code: 'B', color: '#10B981', startTime: '13:00', endTime: '21:00', durationMinutes: 480, isAllDay: false, isOnCall: false, supportsSegments: false },
  { id: 'st_night', organizationId: 'org_demo', locationId: 'loc_demo', name: '夜班', code: 'N', color: '#8B5CF6', startTime: '21:00', endTime: '05:00', durationMinutes: 480, isAllDay: false, isOnCall: false, supportsSegments: false },
  { id: 'st_oncall', organizationId: 'org_demo', locationId: 'loc_demo', name: '待命', code: 'OC', color: '#F59E0B', isAllDay: false, isOnCall: true, supportsSegments: false },
  { id: 'st_off', organizationId: 'org_demo', locationId: 'loc_demo', name: '休息', code: 'OFF', color: '#6B7280', isAllDay: true, isOnCall: false, supportsSegments: false },
]

export function previewProjection(month: string, organizationId = 'org_demo', locationId = 'loc_demo') {
  const [year, m] = month.split('-').map(Number)
  const end = new Date(year, m, 0).getDate()
  const projections = Array.from({ length: end }, (_, i) => {
    const day = i + 1
    const date = `${month}-${String(day).padStart(2, '0')}`
    const phase = previewShiftTypes[i % previewShiftTypes.length]
    return {
      date,
      weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
      locationId,
      locationName: '台北總部',
      ruleProjections: [{ ruleId: 'rule_preview', ruleName: 'Preview 輪班規則', patternType: 'preview', patternName: 'A/B/OFF', cycleDay: (i % 5) + 1, phaseLabel: phase.code, phaseDescription: phase.name, expectedShiftTypeId: phase.id, expectedShiftTypeName: phase.name }],
      tokens: [{ code: phase.code, label: phase.name, ruleName: 'Preview 輪班規則' }],
      hiddenCount: 0,
      assignmentCount: 0,
      assignments: [],
      coverageStatus: 'adequate',
      coverageRequirement: 0,
      coverageAssigned: 0,
      overtimeAssignments: [],
      coverageAlerts: [],
      displayState: { mode: 'compact' },
    }
  })
  return { month, dateRange: { start: `${month}-01`, end: `${month}-${String(end).padStart(2, '0')}` }, organizationId, locationId, locations: ['台北總部'], totalDays: end, projections }
}

export function shouldUsePreviewFallback() {
  return process.env.VERCEL === '1' || process.env.MOCK_AI === 'true'
}
