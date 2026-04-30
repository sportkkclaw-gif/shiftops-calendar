# CALENDAR_PROJECTION_ALGORITHM.md — 月曆投影演算法

updated_at: 2026-04-28T12:50:59+08:00
status: P0_patch_complete_user_gate_pending

## 0. 目的
月曆顯示不得直接猜 raw rule；必須由 deterministic projection engine 將 shift rules 投影成 `CalendarDayProjection`。

## 1. 輸入
```ts
type ProjectionInput = {
  dateRange: { start: string; end: string }
  rules: ShiftRuleSemantic[]
  shiftTypes: ShiftType[]
  staffGroups: StaffGroup[]
  assignments: ShiftAssignment[]
  coverageRequirements: CoverageRequirement[]
  overtimeAssignments: OvertimeAssignment[]
  displayPreferences: CalendarDisplayPreferences
}
```

## 2. Cycle day 計算
```ts
function cycleDay(date, anchorDate, cycleDays) {
  const diff = differenceInCalendarDays(date, anchorDate)
  return ((diff % cycleDays) + cycleDays) % cycleDays + 1
}
```

## 3. Phase label 計算
1. 對每條 rule 取 `patternConfig.phases`。
2. 以 cycleDay 找到落在哪個 phase。
3. 回傳 `phaseLabel`：A / B / N / OFF / OC / SPLIT / custom label。
4. 若 named pattern seed 被使用者改過，以 `patternConfig` 為準，不以 `patternName` hard-code。

## 4. 多制度疊加
同一日期可能有多個 rule projection。顯示原則：
- 不同 team/group/location 的 projection 可並存。
- Calendar compact cell 最多顯示 3 個 visual tokens，其餘用 `+N`。
- Day Inspector 必須顯示全部 ruleProjection。
- 若同一 staff 被不同 rule 同時要求，產生 conflict alert。

## 5. Cell display modes
### Compact mode
顯示：日期、最多 3 個 expected shift token、缺口 badge、OT badge。

### Lane mode
依 group/location 分 lane：A組、B組、C組各自顯示 phase。

### Inspector detail mode
顯示完整：rule、cycleDay、phase、expected staff group、actual staff、gap、OT candidates。

## 6. Projection output
```ts
type CalendarDayProjection = {
  date: string
  locationId: string
  ruleProjection: ShiftRuleProjection[]
  assignments: ShiftAssignmentSummary[]
  coverageStatus: CoverageStatus
  overtime: OvertimeProjection
  displayState: { mode: 'compact' | 'lane' | 'inspector'; hiddenCount?: number }
}
```

## 7. 更新時機
- rule 建立/修改。
- preview 產生。
- assignment apply / rollback。
- overtime assignment confirm/cancel。
- staff availability 或 skill 更新。
- coverage requirement 更新。

每次更新必須重新計算 affected date range，不得只改 UI state。

## 8. 驗收
- 2-2-3 anchor date 後第 5 天可正確顯示 phase。
- A組 2-2-3 + B組固定早班 + C組 on-call 同日可疊加。
- Compact mode 超過 3 token 顯示 `+N`。
- Day Inspector 可展開完整 ruleProjection。
- AI 回答「今天是哪個班」必須讀 projection，不重新解析 prompt。
