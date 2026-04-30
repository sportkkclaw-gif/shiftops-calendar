/**
 * Test helpers that expose calendar mapping logic for unit testing.
 * These re-export the pure mapping functions so they can be tested
 * without running a full Next.js server.
 */

/** Re-exports the same logic used in app/calendar/page.tsx fetchMonthGrid() */
export function buildMockGridForTest(baseDate: Date) {
  function eachDayOfInterval({ start, end }: { start: Date; end: Date }): Date[] {
    const out: Date[] = []
    const cur = new Date(start)
    while (cur <= end) { out.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    return out
  }
  function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
  function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

  const start = startOfMonth(baseDate)
  const end = endOfMonth(baseDate)
  const days = eachDayOfInterval({ start, end })

  return days.map((day, idx) => {
    const dayOfCycle = idx % 7
    const shiftCode = dayOfCycle === 5 || dayOfCycle === 6 ? 'B' : 'A'
    const shiftLabel = dayOfCycle === 5 || dayOfCycle === 6 ? '午班' : '早班'
    const staff = ['王小明', '李小華', '陳大山'].slice(0, (idx % 3) + 1)
    const coverageStatus = idx % 5 === 4 || idx % 7 === 6 ? 'low' : 'adequate'
    const overtimeCandidates = coverageStatus === 'low'
      ? [{ name: '王小明', score: 0.85 }, { name: '李小華', score: 0.72 }]
      : []

    return {
      date: day,
      shiftCode,
      shiftLabel,
      assignedStaff: staff,
      coverageStatus: coverageStatus as 'adequate' | 'low' | 'full',
      hasConflict: idx % 11 === 0,
      overtimeCount: coverageStatus === 'low' ? 1 : 0,
      overtimeCandidates,
      hasCoverageAlert: coverageStatus === 'low',
      alertSeverity: (coverageStatus === 'low' ? 'warning' : undefined) as 'warning' | undefined,
    }
  })
}
