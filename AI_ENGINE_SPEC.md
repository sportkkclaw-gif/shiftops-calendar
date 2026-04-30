# AI_ENGINE_SPEC.md — 班表中樞 AI 編排引擎完整規格

## 0. 核心判斷
排班產品加入 AI 後，AI 不應只是「幫忙填表」的小功能，而應成為主要操作入口。使用者不再需要逐頁設定規則、逐格新增班次、逐張報表查異常；使用者描述意圖，AI 生成排班、預演結果、解釋衝突、提出修正，人類確認後才寫入正式班表。

## 1. AI 取代的制式功能

| 原制式功能 | AI 取代方式 | 保留底層 |
|---|---|---|
| 規則建構器表單 | 對話輸入：「做三休一，避開國定假日，A/B輪替」 | Rule parser / rule_apply_runs |
| 規則模板庫 | AI 內建常見排班語意，不要求使用者選模板 | rule_templates 作為 seed/examples |
| 新增班次完整 Modal | 對話或月曆點擊：「明天A班補小王」 | shift_assignments CRUD |
| 報告頁找資料 | 問 AI：「本月缺口在哪？」直接摘要 + 高亮月曆 | coverage / hours calculation |
| Alerts 獨立頁 | AI 主動提示並打在日期 cell / inspector | coverage_alerts table |
| 匯出設定 wizard | 對話：「匯出5月PDF，包含人員與備註」 | export_jobs / export_records |
| 調班建議 | AI 找可替代人員與影響，主管確認 | swap_requests workflow |

## 2. 不可被 AI 取代的底座
1. 登入、RBAC、組織與資料權限。
2. 人員資料、班別時間、假日與農曆資料。
3. 工時計算、覆蓋率計算、衝突檢查。
4. 調班核准的人類決策。
5. PDF / PNG / ICS / Google Calendar 匯出格式。
6. Audit log：所有 AI 建議、預演、套用、回滾都必須留紀錄。

## 3. 排班制度彈性語意層

AI Solver 實作合約以 `AI_SOLVER_SPEC.md` 為準；Mock AI deterministic 行為以 `MOCK_AI_BEHAVIOR_SPEC.md` 為準。
（Jason 2026-04-28 校正）

AI 引擎不得把排班限定為固定週期或固定 A/B 班。所有排班制度都必須先轉成可組合 constraints，再進入 preview solver。完整制度語意庫見 `SHIFT_PATTERNS_SEMANTIC_LIBRARY.md`。

### 3.1 支援制度類型
- 固定班：每日/每週/指定日期固定人員或團隊。
- 基礎輪班：A/B、三班、做三休一、做二休二、任意 work/off phase。
- 命名輪班 seed：2-2-3、4-on-4-off、DuPont、Pitman、Panama、Continental；名稱只作 seed，phase/天數/班別/組別 offset 必須可調。
- 班別時長：8 小時、10 小時壓縮週、12 小時長班、跨日班。
- 非標準制度：split shift 多段班、on-call 待命、flextime 彈性窗口、demand-driven 需求預測排班。
- 覆蓋條件：最低人力、目標人力、技能/資格覆蓋、角色覆蓋。
- 公平與偏好：平均工時、輪休公平、個人偏好、不可用時段。

### 3.2 Constraint 優先序
1. 法規 / 組織硬政策。
2. 最低覆蓋與資格覆蓋。
3. 使用者明確操作例外。
4. 公平性。
5. 偏好。
6. 命名制度 seed 預設值。

### 3.3 結構化 constraint 輸出
```json
{
  "patternType": "named_pattern",
  "patternName": "2-2-3",
  "patternConfig": {
    "cycleDays": 14,
    "phases": [
      { "type": "work", "days": 2, "shiftTypeId": "day_12h" },
      { "type": "off", "days": 2 },
      { "type": "work", "days": 3, "shiftTypeId": "night_12h" },
      { "type": "off", "days": 3 }
    ],
    "groupOffsetDays": 7
  },
  "constraints": [
    { "category": "LEGAL", "key": "min_rest_hours", "operator": "block", "value": 11 },
    { "category": "COVERAGE", "key": "weekend_minimum", "operator": "must", "value": 2 },
    { "category": "SKILL", "key": "manager_required", "operator": "must", "value": 1 }
  ]
}
```


## 4. 月曆投影與加班候選

月曆投影演算法以 `CALENDAR_PROJECTION_ALGORITHM.md` 為準；加班候選流程以 `OVERTIME_FLOW_SPEC.md` 為準。
（Jason 2026-04-28 校正）

AI 產生或修正排班時，不只輸出 assignments；必須同步輸出 calendar projection，讓月曆 cell 可直接顯示今天是哪個班別、缺口在哪、可補加班的是誰。

### 4.1 Calendar Projection 要求
- 每個日期必須有 Expected Shift Layer：顯示制度應排班別，例如 A/B/夜/休/待命/兩段班。
- 每個日期必須有 Assigned Staff Layer：顯示目前實際已排人員。
- 每個日期必須有 Gap / Conflict Layer：顯示缺人、資格不足、工時或休息間隔風險。
- 加班資訊是 Optional Overtime Layer，由設定決定顯示 OT badge、候選人、已確認加班或完全隱藏。

### 4.2 AI 加班候選輸出
當月曆顯示缺口時，AI 必須能輸出可填補加班選項：
```json
{
  "date": "2026-05-08",
  "targetShiftTypeId": "shift_b",
  "gap": { "required": 2, "assigned": 1, "missing": 1 },
  "overtimeDisplayMode": "candidates",
  "candidates": [
    {
      "staffId": "staff_007",
      "staffName": "小林",
      "sourceShiftTypeId": "shift_a",
      "targetShiftTypeId": "shift_b",
      "reason": "當日 A 班結束後可延長，未超過週工時，具備店長資格",
      "riskFlags": [],
      "score": 0.92
    }
  ]
}
```

### 4.3 顯示原則
- 使用者不用問 AI，也要能從月曆知道今天是哪個班。
- AI 回答「今天是哪個班」時，必須引用 calendar projection，不得重新猜測規則。
- 加班顯示可切換；關閉 overlay 後，正式班別與缺口仍保留。

## 5. AI 助理 UI

### 5.1 入口
- `/calendar` 右側固定 AI Assistant Panel。
- Mobile/PWA 使用浮動按鈕開啟。
- 可讀取目前月份、選取日期、員工、班別、假日、既有警告。

### 5.2 常用指令範例
- 「幫我排 2026 年 5 月，A班早上，B班晚上，做三休一。」
- 「A 組用 2-2-3，B 組固定早班，C 組週末 on-call。」
- 「9-13、17-21 做兩段班，週末至少兩人，其中一人要店長。」
- 「四天十小時，週一到週四，不排週五。」
- 「下週不要排小王，他請假。」
- 「今天是哪個班？直接在月曆標出。」
- 「B班缺人時，列出可加班補位的人。」
- 「把月曆加班顯示切成只顯示徽章。」
- 「找出這個月缺人最多的三天。」
- 「把所有週末 B班至少補到 2 人。」
- 「幫我產生可列印 PDF，包含人員、時間、備註。」
- 「5月1日 A班改成小林，檢查有沒有衝突。」

### 5.3 AI 回應格式
AI 不只回文字，必須回結構化 action plan：
```json
{
  "intent": "generate_schedule",
  "summary": "依做三休一 + A/B 輪替 + 假日排除產生 2026 年 5 月排班 preview",
  "semanticRules": [{ "patternType": "rotating", "patternName": "custom_work_off", "patternConfig": { "phases": [{ "workDays": 3 }, { "offDays": 1 }] } }],
  "constraints": [{ "category": "COVERAGE", "key": "weekend_minimum", "operator": "must", "value": 2 }],
  "confidence": 0.91,
  "requiresConfirmation": true,
  "proposedActions": [
    {
      "type": "create_shift_assignment",
      "date": "2026-05-01",
      "staffId": "staff_001",
      "shiftTypeId": "shift_a",
      "reason": "符合做三休一循環，且未超過週工時"
    }
  ],
  "warnings": [
    {
      "date": "2026-05-03",
      "severity": "warning",
      "message": "B班覆蓋不足 1 人"
    }
  ],
  "calendarProjection": [{ "date": "2026-05-01", "expectedShiftLabel": "A", "assignedStaffCount": 1, "gapCount": 0, "overtimeDisplayMode": "badge" }],
  "previewToken": "preview_abc123"
}
```

## 6. AI API

### POST `/api/ai/interpret`
將自然語言轉成意圖與可執行 action draft。

Request:
```json
{
  "message": "下週A班做三休一，避開國定假日",
  "context": {
    "month": "2026-05",
    "selectedDate": "2026-05-01",
    "locationId": "loc_001"
  }
}
```

Response:
```json
{
  "data": {
    "intent": "generate_schedule",
    "entities": {
      "dateRange": { "start": "2026-05-04", "end": "2026-05-10" },
      "shiftTypes": ["A班"],
      "rule": "做三休一",
      "avoidHolidays": true
    },
    "needsClarification": false
  }
}
```

### POST `/api/ai/preview-schedule`
AI 產生預演，不寫入正式班表。

### POST `/api/ai/apply-preview`
使用者確認後，將 preview 寫入正式班表。

### POST `/api/ai/revise-preview`
使用者用自然語言修正預演，例如「週末多補一人」。

### POST `/api/ai/explain-alert`
解釋某個缺班或超時警告的原因與修正建議。

### POST `/api/ai/export-command`
將自然語言轉成匯出 job。

## 7. AI 資料表

### `ai_conversations`
- id
- user_id
- organization_id
- title
- last_message_at
- created_at

### `ai_messages`
- id
- conversation_id
- role: user / assistant / system
- content
- structured_payload jsonb
- created_at

### `ai_schedule_previews`
- id
- conversation_id
- preview_token
- date_range_start
- date_range_end
- proposed_assignments jsonb
- warnings jsonb
- status: draft / applied / discarded
- created_by
- created_at
- applied_at

### `ai_action_logs`
- id
- user_id
- action_type
- target_table
- target_id
- prompt
- structured_action jsonb
- before_snapshot jsonb
- after_snapshot jsonb
- status
- created_at

### `ai_preference_memory`
- id
- organization_id
- staff_id nullable
- preference_type
- preference_value jsonb
- source: manual / inferred / imported
- confidence
- updated_at

## 8. AI Fallback
如果沒有 AI API Key，系統仍可驗收：
- 使用 deterministic mock interpreter 支援固定班、做三休一、做四休四、2-2-3、A/B輪替、split shift、on-call、compressed week、技能覆蓋、補人、匯出PDF、查缺班。
- Mock 回傳完整 structured payload，不得只回文字。
- UI 顯示「Mock AI 模式」，但流程必須完整跑通。

## 9. 安全與確認機制
1. AI 不得直接寫正式班表，必須先 preview。
2. 所有 apply 都要人類確認。
3. Manager 以上才能套用整月排班。
4. Member 可請 AI 查詢與提出調班，但不可批量改班表。
5. AI 每個班次都要附原因 reason。
6. AI 操作必須可回滾。
7. 不得 hard-code 固定週期或固定班數；所有制度必須經由 semantic rules / constraints 表達。

## 10. 驗收腳本
1. 輸入「做三休一，排 2026 年 5 月 A/B 班」→ 出現 preview → 確認後月曆更新。
2. 輸入「找出本月缺口」→ 月曆標記缺班日期並列摘要。
3. 輸入「幫我 5/1 A班換成小林」→ 顯示衝突檢查 → 確認後更新。
4. 輸入「匯出 5 月 PDF，包含人員與備註」→ 建立 export job → 可下載。
5. 輸入「A組2-2-3、B組固定早班、C組週末待命」→ preview 同時產生三套制度且可解釋 constraint。
6. 輸入「9-13、17-21兩段班，週末至少兩人且一人是店長」→ split shift + skill coverage 正確產生。
7. 無 AI Key 時啟用 Mock AI，上述流程仍可通過。
