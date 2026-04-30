import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ShiftOps Calendar...')

  // Create organization
  const org = await prisma.organization.create({
    data: {
      id: 'org_demo',
      name: 'SuperShift Corp',
    },
  })

  // Create location
  const location = await prisma.location.create({
    data: {
      id: 'loc_demo',
      organizationId: org.id,
      name: '台北總部',
      timezone: 'Asia/Taipei',
    },
  })

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      id: 'user_admin',
      email: 'admin@supershift.com',
      passwordHash: 'hashed_admin_password',
      role: 'ADMIN',
      organizationId: org.id,
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      id: 'user_manager',
      email: 'manager@supershift.com',
      passwordHash: 'hashed_manager_password',
      role: 'MANAGER',
      organizationId: org.id,
    },
  })

  // ACCEPTANCE demo account: manager@shiftops.local / manager2026
  const acceptanceManager = await prisma.user.create({
    data: {
      id: 'user_shiftops_manager',
      email: 'manager@shiftops.local',
      // Password: manager2026, hashed with SHA256(password + SECRET)
      // Hash computed in-node: crypto.createHash('sha256').update('manager2026' + SECRET).digest('hex')
      passwordHash: '064f849c76d72bcb18e5b99e14e1fc2caa141c6db611ca0bfd48673146f923af',
      role: 'MANAGER',
      organizationId: org.id,
    },
  })

  // Create staff profiles
  const staffData = [
    { id: 'staff_1', name: '王小明', email: 'xiaoming@corp.com', roleCode: 'MANAGER', color: '#3B82F6' },
    { id: 'staff_2', name: '李小華', email: 'xiaohua@corp.com', roleCode: 'SENIOR', color: '#10B981' },
    { id: 'staff_3', name: '陳大山', email: 'dashan@corp.com', roleCode: 'REGULAR', color: '#F59E0B' },
    { id: 'staff_4', name: '張小美', email: 'xiaomei@corp.com', roleCode: 'REGULAR', color: '#EF4444' },
    { id: 'staff_5', name: '林大雄', email: 'daxiong@corp.com', roleCode: 'SENIOR', color: '#8B5CF6' },
    { id: 'staff_6', name: '劉小琳', email: 'xiaolin@corp.com', roleCode: 'REGULAR', color: '#EC4899' },
  ]

  for (const s of staffData) {
    await prisma.staffProfile.create({
      data: {
        id: s.id,
        organizationId: org.id,
        locationId: location.id,
        name: s.name,
        email: s.email,
        roleCode: s.roleCode,
        color: s.color,
        active: true,
      },
    })
  }

  // Create shift types
  const shiftTypes = [
    { id: 'st_morning', name: '早班', code: 'A', color: '#3B82F6', startTime: '09:00', endTime: '17:00', durationMinutes: 480 },
    { id: 'st_afternoon', name: '午班', code: 'B', color: '#10B981', startTime: '13:00', endTime: '21:00', durationMinutes: 480 },
    { id: 'st_night', name: '夜班', code: 'N', color: '#8B5CF6', startTime: '21:00', endTime: '05:00', durationMinutes: 480 },
    { id: 'st_oncall', name: '待命', code: 'OC', color: '#F59E0B', isOnCall: true },
    { id: 'st_off', name: '休息', code: 'OFF', color: '#6B7280' },
  ]

  for (const st of shiftTypes) {
    await prisma.shiftType.create({
      data: {
        id: st.id,
        organizationId: org.id,
        locationId: location.id,
        name: st.name,
        code: st.code,
        color: st.color,
        startTime: st.startTime,
        endTime: st.endTime,
        durationMinutes: st.durationMinutes,
        isOnCall: st.isOnCall ?? false,
      },
    })
  }

  // Create shift rules
  const rules = [
    {
      id: 'rule_3on1off',
      name: '做三休一制',
      patternType: 'n_on_m_off',
      patternName: '3-1',
      patternConfig: JSON.stringify({ n: 3, m: 1 }),
      constraints: JSON.stringify({ maxWeeklyMinutes: 2400, minRestHours: 12 }),
      scopeFilter: JSON.stringify({ staffIds: ['staff_1', 'staff_2', 'staff_3'] }),
    },
    {
      id: 'rule_4on4off',
      name: '做四休四制',
      patternType: 'n_on_m_off',
      patternName: '4-4',
      patternConfig: JSON.stringify({ n: 4, m: 4 }),
      constraints: JSON.stringify({ maxWeeklyMinutes: 2400, minRestHours: 24 }),
      scopeFilter: JSON.stringify({ staffIds: ['staff_4', 'staff_5'] }),
    },
    {
      id: 'rule_ab',
      name: 'A/B 輪替制',
      patternType: 'ab_rotation',
      patternName: 'A-B',
      patternConfig: JSON.stringify({ shifts: ['A', 'B'], cycleDays: 2 }),
      constraints: JSON.stringify({ maxWeeklyMinutes: 2400 }),
      scopeFilter: JSON.stringify({ staffIds: ['staff_6'] }),
    },
  ]

  for (const r of rules) {
    await prisma.shiftRule.create({
      data: {
        id: r.id,
        organizationId: org.id,
        locationId: location.id,
        name: r.name,
        patternType: r.patternType,
        patternName: r.patternName,
        patternConfig: r.patternConfig,
        constraints: r.constraints,
        priority: 100,
        scopeFilter: r.scopeFilter,
        effectiveFrom: new Date('2026-01-01'),
        active: true,
      },
    })
  }

  // Create named pattern seeds
  const patterns = [
    { name: '2-2-3', patternType: 'fixed_rotation', defaultConfig: JSON.stringify({ cycle: [2, 2, 3] }), description: '兩天早班、兩天午班、三天休息' },
    { name: '4-4', patternType: 'n_on_m_off', defaultConfig: JSON.stringify({ n: 4, m: 4 }), description: '做四天休四天' },
    { name: 'DuPont', patternType: 'dupont', defaultConfig: JSON.stringify({ cycles: [2, 2, 3] }), description: 'DuPont 四班二倒' },
    { name: 'Pitman', patternType: 'pitman', defaultConfig: JSON.stringify({ cycles: [2, 2, 3] }), description: 'Pitman 四班二倒' },
  ]

  for (const p of patterns) {
    await prisma.namedPatternSeed.create({
      data: {
        id: `pattern_${p.name}`,
        name: p.name,
        patternType: p.patternType,
        defaultConfig: p.defaultConfig,
        description: p.description,
      },
    })
  }

  // Create coverage requirements
  await prisma.coverageRequirement.create({
    data: {
      id: 'cov_morning_weekday',
      organizationId: org.id,
      locationId: location.id,
      shiftTypeId: 'st_morning',
      weekday: 1,
      minCount: 2,
      targetCount: 3,
      requiredSkills: JSON.stringify(['REGULAR']),
    },
  })

  await prisma.coverageRequirement.create({
    data: {
      id: 'cov_morning_weekend',
      organizationId: org.id,
      locationId: location.id,
      shiftTypeId: 'st_morning',
      weekday: 6,
      minCount: 1,
      targetCount: 2,
      requiredSkills: JSON.stringify(['MANAGER', 'SENIOR']),
    },
  })

  // Create policy profile
  await prisma.schedulePolicyProfile.create({
    data: {
      id: 'policy_default',
      organizationId: org.id,
      locationId: location.id,
      name: '預設政策',
      maxWeeklyMinutes: 2400,
      minRestMinutes: 720,
      maxConsecutiveDays: 6,
      rules: JSON.stringify({}),
    },
  })

  // Create calendar cell display settings
  await prisma.calendarCellDisplaySetting.create({
    data: {
      id: 'display_default',
      organizationId: org.id,
      label: '早班',
      shortLabel: '早',
      color: '#3B82F6',
      displayPriority: 10,
    },
  })

  // ─── Holiday seed entries (2026) ───────────────────────────────────────────────
  const holidays2026 = [
    { id: 'hol_2026_0101', date: '2026-01-01', name: '元旦', description: '新年假期', source: 'national' },
    { id: 'hol_2026_0217', date: '2026-02-17', name: '春節', description: '農曆新年假期 (初一)', source: 'lunar' },
    { id: 'hol_2026_0218', date: '2026-02-18', name: '春節', description: '農曆新年假期 (初二)', source: 'lunar' },
    { id: 'hol_2026_0219', date: '2026-02-19', name: '春節', description: '農曆新年假期 (初三)', source: 'lunar' },
    { id: 'hol_2026_0220', date: '2026-02-20', name: '春節', description: '農曆新年假期 (初四)', source: 'lunar' },
    { id: 'hol_2026_0221', date: '2026-02-21', name: '春節', description: '農曆新年假期 (初五)', source: 'lunar' },
    { id: 'hol_2026_0228', date: '2026-02-28', name: '和平紀念日', description: '紀念 228 事件', source: 'national' },
    { id: 'hol_2026_0403', date: '2026-04-03', name: '清明節', description: '民族掃墓節', source: 'lunar' },
    { id: 'hol_2026_0404', date: '2026-04-04', name: '清明節', description: '民族掃墓節 (放假)', source: 'lunar' },
    { id: 'hol_2026_0405', date: '2026-04-05', name: '清明節', description: '民族掃墓節 (補假)', source: 'lunar' },
    { id: 'hol_2026_0501', date: '2026-05-01', name: '勞動節', description: '勞動節假期', source: 'national' },
    { id: 'hol_2026_0503', date: '2026-05-03', name: '端午節', description: '端午節假期', source: 'lunar' },
    { id: 'hol_2026_0628', date: '2026-06-28', name: '端午節', description: '端午節 (放假)', source: 'lunar' },
    { id: 'hol_2026_0908', date: '2026-09-08', name: '中秋節', description: '中秋節假期', source: 'lunar' },
    { id: 'hol_2026_0909', date: '2026-09-09', name: '中秋節', description: '中秋節 (補假)', source: 'lunar' },
    { id: 'hol_2026_1009', date: '2026-10-09', name: '國慶日', description: '雙十節', source: 'national' },
    { id: 'hol_2026_1010', date: '2026-10-10', name: '國慶日', description: '雙十節 (補假)', source: 'national' },
  ]

  for (const h of holidays2026) {
    await prisma.holiday.create({
      data: {
        id: h.id,
        organizationId: org.id,
        locationId: location.id,
        date: new Date(h.date),
        name: h.name,
        description: h.description,
        source: h.source,
      },
    })
  }

  // ─── Lunar Date seed entries (2026-2027) ─────────────────────────────────────
  const lunarDates2026 = [
    { id: 'ln_2026_0115', lunarYear: 2026, lunarMonth: 1, lunarDay: 15, solarDate: '2026-02-22', name: '元宵節', description: '農曆正月十五', source: 'lunar' },
    { id: 'ln_2026_0505', lunarYear: 2026, lunarMonth: 5, lunarDay: 5, solarDate: '2026-05-03', name: '端午節', description: '農曆五月初五', source: 'lunar' },
    { id: 'ln_2026_0815', lunarYear: 2026, lunarMonth: 8, lunarDay: 15, solarDate: '2026-09-08', name: '中秋節', description: '農曆八月十五', source: 'lunar' },
    { id: 'ln_2026_1208', lunarYear: 2026, lunarMonth: 12, lunarDay: 8, solarDate: '2026-12-27', name: '臘八節', description: '農曆十二月初八', source: 'lunar' },
    { id: 'ln_2026_1230', lunarYear: 2026, lunarMonth: 12, lunarDay: 30, solarDate: '2027-02-16', name: '除夕', description: '農曆十二月三十', source: 'lunar' },
    { id: 'ln_2027_0101', lunarYear: 2027, lunarMonth: 1, lunarDay: 1, solarDate: '2027-02-17', name: '春節', description: '農曆正月初一', source: 'lunar' },
    { id: 'ln_2027_0115', lunarYear: 2027, lunarMonth: 1, lunarDay: 15, solarDate: '2027-03-03', name: '元宵節', description: '農曆正月十五', source: 'lunar' },
  ]

  for (const l of lunarDates2026) {
    await prisma.lunarDate.create({
      data: {
        id: l.id,
        organizationId: org.id,
        locationId: location.id,
        lunarYear: l.lunarYear,
        lunarMonth: l.lunarMonth,
        lunarDay: l.lunarDay,
        solarDate: l.solarDate ? new Date(l.solarDate) : null,
        name: l.name,
        description: l.description,
        source: l.source,
      },
    })
  }

  console.log('✅ Seed completed:', {
    org: org.name,
    location: location.name,
    staff: staffData.length,
    shiftTypes: shiftTypes.length,
    rules: rules.length,
    holidays: holidays2026.length,
    lunarDates: lunarDates2026.length,
  })
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
