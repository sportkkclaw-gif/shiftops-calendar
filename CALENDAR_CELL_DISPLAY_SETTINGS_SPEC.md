# CALENDAR_CELL_DISPLAY_SETTINGS_SPEC.md — 月曆格班別自由呈現設定規格

updated_at: 2026-04-28T19:02:20+08:00
status: frozen_for_development
source: Jason 確認「月曆格子的呈現班別可以自由設定嗎」後補入正式規格

## 0. 核心結論
月曆格子的班別呈現必須可由組織與使用者設定；不得 hard-code 固定 A/B、固定紅藍、固定每日班數或固定欄位密度。

產品正式定義：

> ShiftType / ShiftRule 決定班別語意與制度投影；CalendarCellDisplaySettings 決定該投影在月曆格如何顯示。

月曆仍以 `CalendarDayProjection` 為 source of truth，不允許 UI 自行推算班別；但 projection 的 visual token、顯示層級、顏色、短標、密度、加班 overlay 呈現模式都必須可設定。

## 1. 設定入口
- Admin / Manager：`Settings → Calendar Display`。
- Calendar 右上快捷：密度、加班 overlay、lane mode。
- 個人偏好：可覆蓋部分顯示密度與是否顯示加班，但不可覆蓋組織權限與資料事實。
- Export 設定：PDF / PNG / ICS 可選是否包含 staff names、coverage gaps、overtime overlay。

## 2. CalendarCellDisplaySettings TypeScript
```ts
type CalendarCellDisplaySettings = {
  id: string
  organizationId: string
  locationId?: string
  shiftTypeId?: string
  patternType?: string
  patternName?: string

  label: string              // 完整顯示：早班、夜班、待命
  shortLabel: string         // 月曆小格：早、夜、OC、OFF
  color: string              // badge 主色
  glowColor?: string         // cell 淺色系暈染色
  textColor?: string
  icon?: string              // optional: moon, phone, rest, alert

  displayPriority: number
  cellDensity: 'compact' | 'standard' | 'detailed'
  showStaffNames: boolean
  showStaffCount: boolean
  showCoverageBadge: boolean
  showConflictBadge: boolean
  showOvertimeBadge: boolean
  overtimeDisplayMode: 'hide' | 'badge' | 'candidates' | 'assignments'

  appliesTo: {
    roleIds?: string[]
    userIds?: string[]
    exportFormats?: ('pdf' | 'png' | 'ics')[]
  }

  createdAt: string
  updatedAt: string
}
```

## 3. Projection visualToken 擴充
`CalendarDayProjection.ruleProjection[].visualToken` 必須由設定產生，不得在前端寫死。

```ts
type CalendarVisualToken = {
  label: string
  shortLabel: string
  color: string
  glowColor?: string
  textColor?: string
  icon?: string
  priority: number
  density: 'compact' | 'standard' | 'detailed'
}
```

## 4. 必支援設定案例
1. 醫院：D / E / N / OFF / OC。
2. 餐飲：早 / 午 / 晚 / 兩段 / 補。
3. 工廠：A / B / C / 休 / 維修待命。
4. 自訂 2-2-3、4-on-4-off、Pitman 等命名制度的 cell 短標與暈染色。
5. Split shift：同一日期可顯示兩段時段摘要。
6. On-call：可用電話/待命 icon 或 OC badge 顯示。
7. Overtime：可隱藏、只顯示 badge、顯示候選、或顯示已確認加班。

## 5. API
- `GET /api/settings/calendar-display`
- `PUT /api/settings/calendar-display`
- `POST /api/settings/calendar-display/reset`
- `GET /api/calendar/projections?from=&to=&displayProfileId=`

## 6. 驗收條件
- 建立自訂班別「早 / 午 / 晚 / 夜 / 待命」後，月曆 cell 不得仍顯示固定 A/B。
- 修改某班別 `shortLabel` 與 `glowColor` 後，重新載入月曆必須生效。
- 切換 compact / standard / detailed，staff names 與 coverage badge 呈現必須變化。
- 關閉 overtime overlay 後，正式班別仍可見；Day Inspector 仍可查加班候選。
- 匯出 PDF / PNG / ICS 時，是否包含加班與人名需尊重 export display settings。

## 7. 開發紅線
- R-DISPLAY-01：不得 hard-code A=紅、B=藍作為唯一顯示規則；只能作 seed default。
- R-DISPLAY-02：UI 不得自行計算今天是哪班，必須讀 `CalendarDayProjection`。
- R-DISPLAY-03：display setting 只改呈現，不得改變正式 assignment。
- R-DISPLAY-04：個人偏好不得突破 RBAC，例如 member 不得透過設定看到無權查看的人員名單。
- R-DISPLAY-05：加班 overlay 不得覆蓋 Expected Shift Layer。
