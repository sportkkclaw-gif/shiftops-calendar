# SHIFT_PATTERNS_SEMANTIC_LIBRARY.md — 排班制度彈性規則語意庫

updated_at: 2026-04-28T11:08:43+08:00
status: active_planning_update
source: Jason 校正「排班機制可以有很多種規矩，不要定時固定；AI 套用時不要被限制」+ Sophie/SUPAGENT 研究整理

## 0. 產品修正結論
本案的排班引擎不得再假設「固定時間、固定週期、固定 A/B 班」。正確方向是：

> 使用者用自然語言描述任何排班制度、例外、偏好、法規與覆蓋需求；AI 將其轉成可組合 constraints，產生 preview；人類確認後才套用。

因此產品不是「規則模板排班工具」，而是「AI 排班制度轉譯 + constraint solver + 人類確認」的工作台。

---

## 1. 制度分類總覽

### 1.1 固定班 Fixed Shift
- 例：固定早班、固定晚班、每週一三五固定某人。
- 參數：班別、對象、人員/團隊、週期、開始/結束日、例外日。
- Constraint：`fixed_assign`, `fixed_recurrence`, `exclude_dates`。

### 1.2 基礎輪班 Rotating Shift
- 例：A/B 輪替、早/中/晚三班輪替、做三休一、做二休二。
- 參數：phase sequence、每 phase 天數、anchor date、組別、輪替方向。
- Constraint：`rotate_phases`, `align_to_anchor`, `staff_group_offset`。

### 1.3 2-2-3 / Pitman / Panama / DuPont / Continental
- 2-2-3：兩天工作、兩天休、三天工作/休，常見 12 小時班。
- Pitman：四組人員、兩週循環，常見 2-2-3 變體。
- Panama：常見 2-2-3 或 4-2 類輪替語意，依組織定義需可調。
- DuPont：四組/12 小時/長週期輪替，常見 4 night → off → 3 day → off 等變體；不可寫死單一公式。
- Continental：多組連續輪替，重點是不讓休假重疊造成無人覆蓋。
- 參數：cycleDays、phaseDays、shiftSequence、groups、groupOffsetDays、coverage continuity。
- Constraint：`named_pattern(seedDefaults) + editable_pattern_config`，命名制度只能當 seed，不得 hard-code。

### 1.4 班別時長制度
- 8 小時標準工時、10 小時壓縮週、12 小時長班、24 小時待命/值班。
- 參數：duration、breakMinutes、weeklyHoursTarget、maxConsecutiveDays、restBetweenShifts。
- Constraint：`shift_duration`, `break_requirement`, `max_weekly_hours`, `min_rest_hours`。

### 1.5 非標準制度
- Split Shift：一天兩段或多段，如 09:00–13:00 + 17:00–21:00。
- On-call：待命，不一定等於實際工時，但需影響可用性與公平性。
- Compressed Week：四天 10 小時、三天 12 小時等。
- Flexible/Flextime：只管覆蓋或總工時，不管固定起迄。
- Demand-driven：依來客/工單/病患量預測調整人力。
- Skill-based：特定班需要資格/證照/資深人員。

---

## 2. AI Constraint 語意模型

```ts
type ConstraintCategory =
  | 'TEMPORAL'
  | 'COVERAGE'
  | 'LEGAL'
  | 'PREFERENCE'
  | 'FAIRNESS'
  | 'OPERATIONAL'
  | 'SKILL'
  | 'DEMAND'

type ShiftRuleSemantic = {
  id: string
  patternType: string // fixed | rotating | named_pattern | split_shift | on_call | compressed_week | flexible | demand_driven
  patternName?: string // DuPont | Pitman | Panama | 2-2-3 | 4-on-4-off | Continental | custom
  patternConfig: Record<string, unknown>
  constraints: Constraint[]
  priority: number
  scope: {
    organizationId: string
    locationIds?: string[]
    teamIds?: string[]
    roleIds?: string[]
    staffIds?: string[]
  }
  effectiveFrom: string
  effectiveUntil?: string | null
}

type Constraint = {
  category: ConstraintCategory
  key: string
  operator: 'must' | 'prefer' | 'avoid' | 'minimize' | 'maximize' | 'warn' | 'block'
  value: unknown
  weight?: number
  source: 'user_prompt' | 'policy' | 'law' | 'seed_pattern' | 'ai_inferred' | 'manual_override'
}
```

### 2.1 常見自然語言 → constraint 映射
| 使用者說法 | 系統解讀 |
|---|---|
| 做三休一 | `rotate_phases([{work:3},{off:1}])` |
| 做四休四 | `rotate_phases([{work:4},{off:4}])` |
| A/B 輪替 | `rotate_phases([{shift:A},{shift:B}])` + `staff_groups` |
| 三班輪替 | `rotate_phases([day, evening, night])` |
| 週末至少兩人 | `minimum_coverage(weekend, count=2)` |
| 避開國定假日 | `exclude_dates(holiday_source)` |
| 兩段班 9-13、17-21 | `split_shift_segments([...])` |
| 本週待命到晚上十點 | `on_call_window(end=22:00)` |
| 四天十小時 | `compressed_week(days=4, hoursPerDay=10)` |
| 需要護理師/店長在場 | `skill_coverage(cert/role, minimum)` |
| 本月盡量平均 | `balance_hours`, `balance_shift_count` |
| 依客流補人 | `demand_sensitive_coverage` |

### 2.2 衝突仲裁優先序
1. 法規 / 組織硬政策（不可違反）
2. 最低人力覆蓋（可低於目標但要警告）
3. 技能/資格覆蓋
4. 使用者明確指定的操作例外
5. 公平性
6. 偏好
7. 命名制度 seed 的預設值

AI 回應必須說明：哪些 constraints 被滿足、哪些被犧牲、為什麼犧牲、替代方案是什麼。

---

## 3. 資料庫修正要求

`shift_rules.pattern_type` 不得只是一組 enum 模板。需支援：
- `pattern_type`: 粗分類。
- `pattern_name`: 可選命名制度，僅作 seed/default。
- `pattern_config`: JSON，保存任意 phase/segment/group/coverage 設定。
- `constraints`: JSON array，保存 AI 解析出的 constraint。
- `priority`: 衝突仲裁。
- `scope_filter`: 支援同組織多制度並行。

新增或強化資料表：
1. `shift_rule_constraints`：若不全部放 JSON，需拆表記錄 constraint。
2. `schedule_policy_profiles`：組織/地區法規與硬政策。
3. `staff_availability_windows`：人員可用/不可用時段，不只日期。
4. `staff_skill_certifications`：技能/資格覆蓋。
5. `demand_forecasts`：需求預測與目標人力。
6. `named_pattern_seeds`：DuPont/Pitman/Panama/2-2-3 等只作可編輯 seed。

---

## 4. 開發紅線

- R-01：不得 hard-code 為固定週期、固定 A/B、固定每日班數。
- R-02：命名制度（DuPont/Pitman/Panama）只能作 seed，使用者必須可調 phase、天數、班別、組別 offset。
- R-03：同一組織內必須支援多制度並行。
- R-04：班別可為單段、多段、待命、彈性窗口；不得只支援 start/end 一段式。
- R-05：AI 不得直接套用正式班表，必須 preview → human confirm → apply → audit。
- R-06：假日、法規、休息間隔、工時上限需由資料/設定讀取，不得寫死單一地區。
- R-07：偏好是 soft constraint；法規、最低覆蓋、資格才是 hard constraint。
- R-08：Mock AI 也必須支援多制度語意，不得只支援「做三休一」。

---

## 5. 新增驗收條件

1. AI 可解析「做四休四，排三個月」，並正確處理非整週循環。
2. AI 可解析「四天十小時，週一到週四，不排週五」。
3. AI 可解析「9-13、17-21 兩段班」。
4. AI 可解析「本週晚間待命到 22:00」。
5. AI 可解析「週末至少兩人，其中一人必須是店長」。
6. 同組織可同時存在 A 組 2-2-3、B 組固定班、C 組 on-call。
7. 命名制度 seed 可被使用者調整，不因名稱固定公式。
8. 法規/休息間隔衝突會阻擋或警告，並解釋原因。
9. 偏好衝突時 AI 可犧牲偏好，但需說明。
10. 無 AI Key 時 mock interpreter 仍可跑通固定班、輪班、split shift、on-call、compressed week、skill coverage 六類案例。
