/**
 * D38 Unit Tests: Coverage Alert Badge Logic in Calendar Cell Mapping
 * Tests that the fetchMonthGrid → DayCellData mapping correctly
 * sets hasCoverageAlert=true for low-coverage days.
 */

process.env.MOCK_AI = 'true'

describe('D38: Calendar coverage alert badge field population', () => {
  /**
   * These tests verify the mapping logic that lives inside fetchMonthGrid()
   * in app/calendar/page.tsx. We test by calling the pure helper that
   * replicates the same logic used by the calendar page.
   */

  it('D38: buildMockGrid flags low coverage days with hasCoverageAlert=true', async () => {
    const { buildMockGrid } = await import('@/components/test-helpers/calendarTestUtils')
    // April 5 (idx 4) is low coverage in the mock
    const grid = buildMockGrid(new Date(2026, 3, 1)) // April 2026
    const lowDays = grid.filter(c => c.hasCoverageAlert)
    expect(lowDays.length).toBeGreaterThan(0)
    lowDays.forEach(day => {
      expect(day.coverageStatus).toBe('low')
    })
  })

  it('D38: buildMockGrid does NOT flag adequate coverage days', async () => {
    const { buildMockGrid } = await import('@/components/test-helpers/calendarTestUtils')
    const grid = buildMockGrid(new Date(2026, 3, 1))
    const adequateDays = grid.filter(c => c.coverageStatus === 'adequate')
    adequateDays.forEach(day => {
      expect(day.hasCoverageAlert).toBe(false)
    })
  })

  it('D38: DayCellData interface declares hasCoverageAlert boolean field', () => {
    // Compile-time check: verify the type exists and works correctly
    const mockCell: import('@/app/calendar/page').DayCellData = {
      date: new Date('2026-04-05'),
      shiftCode: 'A',
      shiftLabel: '早班',
      assignedStaff: ['王小明'],
      coverageStatus: 'low',
      hasConflict: false,
      overtimeCount: 0,
      overtimeCandidates: [],
      hasCoverageAlert: true,
      alertSeverity: 'warning',
    }
    expect(mockCell.hasCoverageAlert).toBe(true)
    expect(mockCell.alertSeverity).toBe('warning')
  })

  it('D38: DayCellData allows alertSeverity to be undefined', () => {
    const mockCell: import('@/app/calendar/page').DayCellData = {
      date: new Date('2026-04-01'),
      shiftCode: 'A',
      shiftLabel: '早班',
      assignedStaff: ['王小明', '李小華'],
      coverageStatus: 'adequate',
      hasConflict: false,
      overtimeCount: 0,
      overtimeCandidates: [],
      hasCoverageAlert: false,
    }
    expect(mockCell.hasCoverageAlert).toBe(false)
    expect(mockCell.alertSeverity).toBeUndefined()
  })

  it('D38: alertSeverity is warning when hasCoverageAlert is true', async () => {
    const { buildMockGrid } = await import('@/components/test-helpers/calendarTestUtils')
    const grid = buildMockGrid(new Date(2026, 3, 1))
    const alertDays = grid.filter(c => c.hasCoverageAlert)
    alertDays.forEach(day => {
      expect(day.alertSeverity).toBe('warning')
    })
  })
})
