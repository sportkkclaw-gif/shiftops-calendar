# CALENDAR_SHIFT_DISPLAY_MODEL.md — 輪班制度與月曆呈現掛勾規格

updated_at: 2026-04-28T12:16:37+08:00
status: active_planning_update
source: Jason 校正「輪班制度會跟月曆上的呈現掛勾；今天是哪個班別要直覺；加班班別可用選項填補，決定是否呈現」

## 0. 核心產品修正
輪班制度不能只存在於 AI / Rule Engine 的計算層。它必須直接映射到月曆顯示，讓使用者在月曆上一眼看出：

1. 今天依輪班制度應該是哪個班別。
2. 目前已排誰。
3. 缺口在哪裡。
4. 可填補加班的另一個班別/人員是誰。
5. 加班資訊是否要顯示，由使用者或組織設定控制。

因此正式模型改為：

> Shift Rule / Rotation Pattern → Calendar Day Cell Projection → Coverage Gap → Overtime Candidate Options → Optional Overtime Display Layer

---

## 1. 月曆 Cell 顯示層級

每個日期格 `CalendarDayCell` 至少分成 5 個視覺層：

### 1.1 Date Context Layer
- 日期、星期、農曆、節日/國定假日。
- 這層不受排班制度影響。

### 1.2 Expected Shift Layer（制度應排班別）
用來顯示「依目前輪班制度，今天應該是哪個班別」。

範例：
- A 班
- B 班
- 夜班
- 休
- 待命
- 兩段班
- 2-2-3 cycle day 5 / phase off

顯示方式：
- 預設 seed 可用 A=紅、B=藍、夜=紫、休=灰、待命=黃、加班=橘，但正式實作不得 hard-code；必須讀 `CalendarCellDisplaySettings`。
- 文字短標可自由設定，例如 `A`、`B`、`早`、`午`、`夜`、`OFF`、`OC`、`OT`。
- 每個班別可設定 badge 色、cell glow 色、文字色、icon、display priority、cell density。
- cell 右上或上緣顯示制度標記，例如 `2-2-3 D5`、`4休4 D2`。完整設定見 `CALENDAR_CELL_DISPLAY_SETTINGS_SPEC.md`。

### 1.3 Assigned Staff Layer（實際已排人員）
顯示該班別目前排了誰。
- 完整：顯示前 2–3 位姓名 + `+N`。
- 壓縮：只顯示人數與缺口狀態。
- 點擊後由 Day Inspector 展開完整名單。

### 1.4 Gap / Conflict Layer（缺口與衝突）
用徽章或邊框顯示：
- 缺 1 人 / 缺店長 / 缺證照人員。
- 工時超限。
- 連班風險。
- 休息間隔不足。
- 休假/不可用人員被排到。

### 1.5 Optional Overtime Layer（可選加班顯示層）
加班不是永遠顯示；它是可切換的 overlay。

使用者可選：
- `hide_overtime`：月曆不顯示加班，只在 Inspector 顯示。
- `show_overtime_badge`：只顯示 OT 徽章與數量。
- `show_overtime_candidates`：顯示可加班候選班別/人員簡碼。
- `show_overtime_assignments`：顯示已確認加班人員。

---

## 2. 資料模型：Calendar Projection

月曆不是直接讀 raw rule，而是讀「投影結果」。

```ts
type CalendarDayProjection = {
  date: string
  locationId: string
  ruleProjection: ShiftRuleProjection[]
  assignments: ShiftAssignmentSummary[]
  coverageStatus: CoverageStatus
  overtime: OvertimeProjection
  displayState: CalendarDisplayState
}

type ShiftRuleProjection = {
  ruleId: string
  patternType: string
  patternName?: string
  cycleDay?: number
  phaseLabel?: string // A班 / B班 / OFF / Night / On-call
  expectedShiftTypeIds: string[]
  expectedStaffGroupIds?: string[]
  visualToken: {
    label: string
    color: string
    priority: number
  }
}

type OvertimeProjection = {
  displayMode: 'hide' | 'badge' | 'candidates' | 'assignments'
  overtimeNeeded: boolean
  neededShiftTypeIds: string[]
  candidateOptions: OvertimeCandidate[]
  confirmedAssignments: OvertimeAssignment[]
}

type OvertimeCandidate = {
  staffId: string
  staffName: string
  sourceShiftTypeId?: string
  targetShiftTypeId: string
  reason: string
  riskFlags: string[]
  score: number
}
```

---

## 3. 加班填補互動模型

### 3.1 從月曆直接判斷可加班班別
當某日期 cell 顯示 `B班缺1人`，系統必須可由 Day Inspector 或 AI panel 提供：
- 可從 A 班延長的人。
- 可從休假/待命人員補上的人。
- 可從其他據點支援的人。
- 可加班但有風險的人。
- 不可加班原因：工時超限、休息間隔不足、請假、資格不符。

### 3.2 加班選項不是強制呈現
加班呈現要是設定項：
- 組織預設：Settings → Calendar Display → Overtime Display。
- 個人偏好：使用者可在月曆右上 toggle。
- 匯出設定：PDF/PNG/ICS 可選是否包含加班。

### 3.3 加班不等於正式班表覆寫
加班是一層補充 assignment：
- 原制度班別仍存在。
- 加班 assignment 以 `assignmentType='overtime'` 或 `isOvertime=true` 標記。
- audit log 必須記錄「誰將誰加入哪一天哪一班的加班」。

---

## 4. 月曆互動流程

### Flow A：看今天是哪個班
1. 使用者打開 `/calendar`。
2. 月曆 cell 直接顯示制度應排班別，例如 `A班`、`B班`、`OFF`。
3. 今日 cell 有高亮。
4. 使用者不需打開 AI，也能知道今天是哪個班。

### Flow B：缺人 → 顯示可加班選項
1. 某日 `B班` 顯示缺 1 人。
2. 使用者點日期。
3. Day Inspector 顯示 `B班缺1人`。
4. 下方顯示「可填補加班選項」。
5. 使用者選擇候選人或問 AI：「誰最適合補 B 班？」
6. AI 顯示候選與理由。
7. 使用者確認後才寫入 overtime assignment。

### Flow C：加班顯示開關
1. 使用者在月曆右上切換 `顯示加班`。
2. 月曆 cell 立刻切換 OT overlay。
3. 關閉後，正式班別仍可見，加班資訊只在 Inspector 或匯出選項中出現。

---

## 5. 開發紅線

- R-CAL-01：輪班制度必須能投影到月曆 cell；不得只在報表或 AI 對話中顯示。
- R-CAL-02：月曆 cell 必須顯示「制度應排班別」與「實際已排人員」的差異。
- R-CAL-03：加班必須是 optional overlay，不得強制塞滿月曆造成干擾。
- R-CAL-04：加班 assignment 不得覆蓋原制度班別；必須以 overtime 類型保存。
- R-CAL-05：AI 推薦加班人選必須說明來源班別、可用性、工時風險與資格風險。
- R-CAL-06：PDF/PNG/ICS 匯出必須可選是否包含加班資訊。

---

## 6. 驗收條件

1. 月曆每個日期 cell 可直接看出應排 A/B/夜/休/待命/兩段班等狀態。
2. 點擊今日 cell，可以看到今天制度班別、實際人員、缺口、警告。
3. 當 B 班缺人時，Day Inspector 顯示可加班候選選項。
4. 使用者可切換是否在月曆上顯示加班 overlay。
5. 關閉加班 overlay 後，正式班別顯示不受影響。
6. 確認加班後，該日 cell 可顯示 OT badge 或加班人員，依 display setting 而定。
7. 匯出 PDF 時可選是否包含加班資訊。
8. AI 回答「今天是哪個班」時，必須引用 calendar projection，而不是重新猜測規則。


## 6. Calendar Cell Display 自由設定
月曆格的班別呈現必須由 `CalendarCellDisplaySettings` 控制。ShiftType/ShiftRule 決定「今天應是哪班」，display settings 決定「在 cell 上如何顯示」。因此醫院、餐飲、工廠、客服中心可使用不同短標、顏色、暈染與密度；不得只做固定 A/B 紅藍。
