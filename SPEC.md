# SPEC.md — 班表中樞 ShiftOps Calendar 完整版技術規格

## 0. 定位
本案是 AI-first 排班 Web/PWA 完整版。開發人員需一次做到可登入、可用 AI 產生與修正排班、可人工確認、可查缺口、可調班、可匯出、可驗收。

## 1. 技術棧
- Frontend: Next.js 15 App Router + TypeScript + Tailwind CSS + Zustand + TanStack Query
- Backend: Next.js 15 Route Handlers（權威技術棧）；不得改用 Vite/Express 作為正式實作架構。
- DB: PostgreSQL + Prisma
- Auth: JWT httpOnly cookie + RBAC
- AI: OpenAI-compatible Chat Completions 或本地 mock AI adapter；所有 AI 回應必須轉成 Zod 驗證後的 structured action
- Export: PDFKit 或 jsPDF；PNG export 使用 server-side SVG/HTML render fallback；ICS 使用 ical-generator
- Calendar: date-fns；農曆/節氣以 seed JSON 固定 2026–2027
- Tests: Vitest + Supertest + Playwright
- PWA: manifest + service worker + offline last-known schedule cache

## 2. 完整版必做模組
1. Auth / RBAC
2. Staff Data Foundation
3. Shift Type Data Foundation
4. Holiday & Lunar Calendar
5. Schedule Command Center with Calendar Shift Projection
6. Day Inspector with Overtime Candidate Options
7. AI Scheduling Assistant
8. AI Schedule Preview / Apply / Rollback
9. Flexible Constraint Rule Engine for AI tools
10. Coverage Engine for AI explanations
11. Inline Alerts inside Calendar / Inspector
12. Swap Request Workflow with AI suggestions
13. AI Query Reports / optional detailed report panels
14. Export Center with AI command trigger: PDF / PNG / ICS / Google Calendar fallback
15. Settings / Preferences
16. Billing placeholder / Plan limits
17. PWA Offline Cache
18. Seed Data + Demo Accounts + Mock AI examples

## 3. 路由
核心路由需改為 AI-first：
- `/calendar`：月曆主控台 + AI Assistant Panel + Day Inspector
- `/ai-assist`：完整對話與預演紀錄
- `/data/staff`：人員資料底座
- `/data/shifts`：班別資料底座
- `/data/holidays`：假日與農曆資料底座
- `/swap-requests`：調班審核，含 AI 建議
- `/reports`：AI 查詢報告與備用詳細圖表
- `/export`：匯出中心，支援自然語言觸發
- `/export/history`：匯出歷史
- `/settings`：偏好設定，包含 Calendar Display：班別短標、顏色、暈染、密度、是否顯示人名/缺口/加班 overlay
- `/billing`：訂閱方案
- `/audit`：AI 與人工操作紀錄

## 4. 被 AI 取代或收斂的傳統功能
- 傳統規則建構器頁：改由 AI 對話產生規則與預演。
- 規則模板庫：改為 AI 內建常見排班語意與 seed examples。
- 完整新增/編輯班次 Modal：改為 AI 對話 + inline quick edit。
- 獨立 Alerts 頁：改為月曆與 Day Inspector 內嵌提示。
- 傳統報告頁：改為 AI 問答摘要 + 可選詳細圖表。
- 複雜匯出 wizard：改為自然語言指定範圍與格式，保留格式設定面板。

## 5. 資料庫最低表
users, organizations, locations, staff_profiles, roles, shift_types, shift_assignments, shift_rules, shift_rule_constraints, schedule_policy_profiles, staff_availability_windows, staff_skill_certifications, named_pattern_seeds, demand_forecasts, rule_templates, rule_apply_runs, holidays, lunar_days, coverage_requirements, coverage_alerts, calendar_day_projections, overtime_candidates, overtime_assignments, swap_requests, export_jobs, export_records, notifications, audit_events, calendar_cell_display_settings, user_preferences, plan_limits, billing_accounts, ai_conversations, ai_messages, ai_schedule_previews, ai_action_logs, ai_preference_memory。

## 6. API 共通格式
成功：`{ "data": ..., "meta": { "requestId": "..." } }`
錯誤：`{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {} } }`

## 7. AI API
- `POST /api/ai/interpret`
- `POST /api/ai/preview-schedule`
- `POST /api/ai/revise-preview`
- `POST /api/ai/apply-preview`
- `POST /api/ai/explain-alert`
- `POST /api/ai/export-command`
- `GET /api/ai/conversations`
- `GET /api/ai/previews/:id`

## 8. Flexible Constraint Rule Engine
權威實作合約見 `AI_SOLVER_SPEC.md`、`MOCK_AI_BEHAVIOR_SPEC.md`、`PRISMA_SCHEMA_SPEC.md`。

## 8.1 Solver / Mock / Schema authority
Rule Engine 不再是前端規則表單，而是 AI tool layer。不得 hard-code 固定時間、固定週期、固定 A/B 班或固定每日班數。所有排班制度必須被轉成 `semanticRules + constraints`，再產生 assignments preview、conflicts、coverage warnings，使用者確認後才寫入正式 `shift_assignments`。

必須支援：
- 固定班：daily / weekly / selected weekdays / selected dates。
- 任意 work/off phase：做三休一、做二休二、做四休四、任意 N-on-M-off。
- 命名制度 seed：2-2-3、4-on-4-off、DuPont、Pitman、Panama、Continental；名稱只作可編輯 seed，不得寫死單一公式。
- 班別時長：8h、10h、12h、跨日班、break requirement。
- split shift：一天多段時段。
- on-call：待命時段與 response time。
- compressed week：四天十小時等壓縮工時。
- skill / role coverage：指定班別需特定資格或角色。
- demand-driven coverage：依需求預測調整最低/目標人力。
- holiday exceptions、staff unavailable windows、max hours per week、min rest between shifts、minimum coverage per shift type。

`shift_rules` 必須有 `pattern_type`、`pattern_name`、`pattern_config JSON`、`constraints JSON/child table`、`priority`、`scope_filter`、`effective_from/until`。完整語意庫見 `SHIFT_PATTERNS_SEMANTIC_LIBRARY.md`。

## 9. Calendar Shift Projection & Overtime Display
權威演算法見 `CALENDAR_PROJECTION_ALGORITHM.md`；加班候選流程見 `OVERTIME_FLOW_SPEC.md`。

## 9.1 Projection display rules
輪班制度必須掛勾月曆呈現。系統需在 Rule Engine 產生排班 preview 後，同步產生 `CalendarDayProjection`，讓每個日期 cell 能直覺顯示：制度應排班別、實際已排人員、缺口/衝突、可選加班 overlay。

月曆 cell 必須分層：
1. Date Context：日期、星期、農曆、節日。
2. Expected Shift：依制度投影出的 A/B/夜/休/待命/兩段班等狀態。
3. Assigned Staff：實際已排人員摘要。
4. Gap / Conflict：缺人、資格不足、超時、休息間隔不足。
5. Optional Overtime：可切換的 OT badge / candidates / assignments overlay。

加班是 optional display layer，不得覆蓋原制度班別。加班 assignment 必須標記 `assignmentType='overtime'` 或 `isOvertime=true`，並保留 audit log。使用者可在月曆右上、個人偏好、匯出設定中選擇是否顯示加班資訊。完整規格見 `CALENDAR_SHIFT_DISPLAY_MODEL.md`；月曆格班別顯示自由設定見 `CALENDAR_CELL_DISPLAY_SETTINGS_SPEC.md`。

## 10. Coverage Engine
Coverage alert lifecycle：`generated → acknowledged → resolved → archived`。缺口由 deterministic coverage engine 產生；加班補上或手動補人後自動重算並標記 resolved；過期未處理 alert 轉 archived。
每天每班檢查 requiredCount vs actualCount、overtime risk、back-to-back risk、unavailable staff assigned、holiday coverage missing。結果提供給 AI 解釋，也在月曆與 Day Inspector 內嵌顯示。

## 11. Export
Export 必須採 async job state machine：pending → processing → completed / failed → expired。API 至少包含 `POST /api/export/jobs`、`GET /api/export/jobs/:id`、`GET /api/export/jobs/:id/download`。
必做 PDF monthly schedule、PNG preview export、ICS calendar file、Google Calendar import instructions/fallback link、Export history。AI 可用自然語言觸發 export job，但檔案生成必須走標準格式引擎。

## 12. Mock / Fallback
無外部服務時仍要完整驗收：
- AI API Key 未設定：啟用 deterministic mock AI，支援固定班、做三休一、做四休四、2-2-3、A/B輪替、split shift、on-call、compressed week、技能覆蓋、補人、查缺班、匯出 PDF 等固定語句。
- Google Calendar OAuth 未設定：產出 ICS + 顯示匯入教學。
- PDF render 失敗：產出 HTML printable page。
- 農曆 API 不可用：使用 seed lunar_days。
- Email/Push 不可用：寫入 notifications table + UI 顯示。


## 13. 權限與資料模型補件
- RBAC 權威矩陣：`RBAC_MATRIX.md`。
- Prisma 權威 schema：`PRISMA_SCHEMA_SPEC.md`。
- Split shift 採 `ShiftAssignment + ShiftAssignmentSegment`。
- Rollback 以 `RuleApplyRun` 為單位，restore `beforeSnapshot`。
- Billing 本階段為 placeholder / plan limits demo，不接金流；若要真 billing 需另補金流規格。


## 14. Final freeze note
Jason 已審核 OK 三張 UI/功能示意圖。本規格凍結為 Sebastian 開發輸入；不得拆工、不得固定 A/B 呈現、不得讓 AI 直接寫正式班表。
