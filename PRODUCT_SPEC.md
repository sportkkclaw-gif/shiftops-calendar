# PRODUCT_SPEC.md — 班表中樞 ShiftOps Calendar（AI-first 多制度排班 Web/PWA）

updated_at: 20260430T224643+0800  
pm_owner: Sophie / 蘇策  
source_spec: `SPEC.md`  
canonical_task_id: `20260428_shift_scheduler_web_supershift_style`  
status: developer_ready_spec_normalized  
active_product_lock: `PM_OP_QC_REPAIR_LOOP / 20260428_shift_scheduler_web_supershift_style`

---

## 1. 產品名稱

**中文顯示名稱**：班表中樞 ShiftOps Calendar（第1版）  
**內部 ID**：`20260428_shift_scheduler_web_supershift_style`  
**產品型態**：AI-first 多制度排班 Web / PWA 產品  
**設計參考方向**：Supershift 深色 iOS-like 工具介面；黑底、深灰大圓角卡片、粗白字、浮動底部 tab、月曆為核心。

---

## 2. 產品定位

ShiftOps Calendar 是給店長、營運主管與排班管理者每日使用的排班中樞。產品不是 landing page、不是 PromptForge、不是單純 UI mock，也不是只會產文字的 AI 聊天工具；它必須讓使用者在同一個 Web/PWA 內完成：

1. 登入與角色權限控管。
2. 建立人員、班別、假日與農曆資料。
3. 用 AI 產生可驗證的 structured 排班 preview。
4. 在使用者確認前不寫正式班表。
5. 套用 preview 後在月曆 cell 直接顯示制度應排班別、已排人員、缺口、警告與可選加班 overlay。
6. 支援調班、加班候選、匯出、離線最後已知班表與 mock AI 驗收。

---

## 3. 目標使用者

| 角色 | 主要任務 | 權限摘要 |
|---|---|---|
| Admin | 組織設定、使用者/地點/方案限制、全域資料維護 | 全權限 |
| Manager | 排班、AI preview/apply、調班核准、匯出、報告 | 可管理本組織/地點班表 |
| Member | 查看個人班表、提出調班、查看通知 | 不可直接套用正式班表 |
| QC/驗收者 | 以 demo seed 與 mock AI 重現核心流程 | 使用 `manager@shiftops.local / manager2026` |

---

## 4. 核心痛點

1. 中小型團隊排班規則常混合固定班、輪班、做 N 休 M、on-call、split shift、技能覆蓋與臨時加班，傳統表單難以表達。
2. AI 若只輸出文字，無法被驗收、無法 rollback、無法保證不直接覆蓋正式資料。
3. 管理者需要在月曆 cell 上直接看懂「制度應排」、「實際已排」、「缺口/衝突」與「可加班選項」，不能每次都打開 AI 或報表。
4. 驗收不能依賴外部 AI Key、Google OAuth、PDF 服務或網路狀態；必須有 deterministic mock/fallback。

---

## 5. 成功標準

本產品完成時，必須可由 Sebastian/OP 以正式 build/test/live probe 證明：

- manager demo 帳號可登入。
- 2026 年 5 月月曆可顯示班表、A/B/休假/節日/農曆。
- AI Assistant 可產生 structured preview，且 preview 不會直接寫入正式班表。
- Manager 確認後正式套用；可 rollback。
- 月曆 cell 不開 AI 也可看到制度應排班別、已排人員、缺口 badge、警告與加班 overlay。
- 支援固定班、輪班、2-2-3、做四休四、split shift、on-call、compressed week、技能覆蓋、多制度並行。
- 調班申請 → AI 替代建議 → manager 核准 → audit log 閉環。
- PDF/PNG/ICS export、Google fallback、PWA install、offline last-known schedule 可驗收。
- 無 AI Key 時 mock AI 仍能跑通核心腳本。

---

## 6. 功能範圍

### 6.1 必做模組

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
14. Export Center：PDF / PNG / ICS / Google Calendar fallback
15. Settings / Calendar Display Preferences
16. Billing placeholder / Plan limits demo
17. PWA Offline Cache
18. Seed Data + Demo Accounts + Mock AI examples
19. Audit Log / AI action logs
20. Multi-policy parallel scheduling inside one organization

### 6.2 明確不做

- 不做 PromptForge 或提示詞生成工具。
- 不做僅有首頁的 marketing site。
- 不做 AI 直接覆寫正式班表。
- 不做無 preview/confirm/audit/rollback 的排班。
- 不接正式金流；Billing 僅 placeholder / plan limits demo。

---

## 7. 頁面結構

| 路由 | 頁面 | 必備內容 |
|---|---|---|
| `/` | 入口/redirect | 未登入導 login，登入後導 `/calendar` |
| `/login` | 登入 | demo 帳號登入、錯誤提示 |
| `/calendar` | 月曆主控台 | MonthHeader、CalendarGrid、CalendarCell、AI Assistant Panel、Day Inspector、OT overlay toggle |
| `/ai-assist` | AI 對話與預演紀錄 | conversations、preview detail、revise/apply/rollback entry |
| `/data/staff` | 人員資料 | staff CRUD、角色/技能/availability |
| `/data/shifts` | 班別資料 | shift type CRUD、顏色、時間、split/on-call 設定 |
| `/data/holidays` | 假日與農曆 | 2026–2027 seed、節日/節氣顯示 |
| `/swap-requests` | 調班 | member 申請、AI 替代建議、manager approve/reject |
| `/reports` | 報告 | AI 問答摘要、coverage/hours 表格或簡圖 |
| `/export` | 匯出中心 | PDF/PNG/ICS/Google fallback，自然語言觸發 |
| `/export/history` | 匯出歷史 | export job 狀態與下載入口 |
| `/settings` | 設定 | Calendar Display、偏好、PWA/通知展示 |
| `/billing` | 方案 placeholder | plan limits demo，不接金流 |
| `/audit` | 稽核紀錄 | AI 與人工操作紀錄 |
| `/more` | iOS-like 更多 | 設定卡片、匯出、提醒、偏好入口 |
| `/share-print` | 分享列印 | preview + options + action bar |

---

## 8. 核心使用流程

### Flow A：AI 排班預演與套用
1. Manager 登入。
2. 進 `/calendar` 開 AI Assistant。
3. 輸入「做三休一，排 2026 年 5 月 A/B 班，避開國定假日」。
4. 系統產生 structured preview：assignments、calendarProjection、warnings、explanations。
5. Preview 顯示差異；正式班表尚未被改寫。
6. Manager 點確認套用。
7. 系統建立 `RuleApplyRun`、寫入正式 `shift_assignments`、更新 `calendar_day_projections`、寫 audit log。

### Flow B：修正與 rollback
1. 在 preview 或 applied run 上輸入「週末 B班至少 2 人」。
2. 系統 revise preview 或建立新 preview。
3. 若已 apply，可用 RuleApplyRun rollback 恢復 beforeSnapshot。

### Flow C：缺口/加班
1. Coverage Engine 產生缺口與 risk warnings。
2. 月曆 cell 顯示缺口 badge。
3. Day Inspector 顯示可加班候選與理由。
4. Manager 選擇加班候選後建立 overtime assignment。
5. OT overlay 可切換 hidden/badge/candidates/assignments，不得覆蓋原班別。

### Flow D：調班
1. Member 提出調班申請。
2. AI 建議替代人員與風險。
3. Manager approve/reject。
4. 核准後更新班表與 audit log。

### Flow E：匯出與離線
1. 使用者以自然語言或 Export Center 建立 PDF/PNG/ICS export job。
2. Job 經 pending → processing → completed/failed/expired。
3. Google OAuth 未設定時顯示 ICS + 匯入教學。
4. PWA 離線時顯示 last-known schedule 與離線提示。

---

## 9. UI/UX 要求

### 9.1 視覺語言

- 背景：`#000000`
- 卡片：`#202020` / `#242426`
- 文字：白色粗體；muted text 使用半透明白。
- iOS-like：大圓角 32–56px、膠囊工具列、浮動底部 tab、右下 FAB。
- Supershift 參考：工具感優先，不做浮誇 AI SaaS hero。

### 9.2 Calendar Cell 分層

每個日期 cell 必須分層顯示：

1. Date Context：日期、星期、農曆、節日。
2. Expected Shift：制度投影出的 A/B/夜/休/待命/兩段班等狀態。
3. Assigned Staff：實際已排人員摘要。
4. Gap / Conflict：缺人、資格不足、超時、休息間隔不足。
5. Optional Overtime：OT badge / candidates / assignments overlay。

### 9.3 Responsive

- Mobile：單欄、底部 floating tab、FAB。
- Tablet：月曆置中，設定窄欄。
- Desktop：centered app shell；可雙欄顯示 preview + options。

---

## 10. 技術限制與權威技術棧

- Frontend：Next.js 15 App Router + TypeScript + Tailwind CSS + Zustand + TanStack Query。
- Backend：Next.js 15 Route Handlers；不得改用 Vite/Express 作正式架構。
- DB：PostgreSQL + Prisma。
- Auth：JWT httpOnly cookie + RBAC。
- AI：OpenAI-compatible Chat Completions 或 deterministic mock AI adapter；所有 AI 回應必須轉成 Zod 驗證後的 structured action。
- Export：PDFKit 或 jsPDF；PNG export 需 server-side SVG/HTML render fallback；ICS 使用 ical-generator。
- Calendar：date-fns；農曆/節氣以 seed JSON 固定 2026–2027。
- Tests：Vitest + Supertest + Playwright。
- PWA：manifest + service worker + offline last-known schedule cache。

---

## 11. 資料欄位與資料模型

最低資料表/模型不得少於以下範圍；完整 Prisma 權威規格見 `PRISMA_SCHEMA_SPEC.md`。

- users, organizations, locations, staff_profiles, roles
- shift_types, shift_assignments, shift_assignment_segments
- shift_rules, shift_rule_constraints, schedule_policy_profiles
- staff_availability_windows, staff_skill_certifications
- named_pattern_seeds, demand_forecasts, rule_templates, rule_apply_runs
- holidays, lunar_days
- coverage_requirements, coverage_alerts
- calendar_day_projections
- overtime_candidates, overtime_assignments
- swap_requests
- export_jobs, export_records
- notifications, audit_events
- calendar_cell_display_settings, user_preferences
- plan_limits, billing_accounts
- ai_conversations, ai_messages, ai_schedule_previews, ai_action_logs, ai_preference_memory

### 11.1 關鍵資料欄位

- `ShiftRule.pattern_type / pattern_name / pattern_config / constraints / priority / scope_filter / effective_from / effective_until`
- `CalendarDayProjection.ruleProjection / assignmentSummary / coverageStatus / overtimeProjection / displayState / projectionHash`
- `ShiftAssignment.assignmentType = REGULAR | OVERTIME | ON_CALL | SPLIT_SEGMENT`
- `AISchedulePreview.previewToken / proposedAssignments / calendarProjection / warnings / beforeSnapshot / status`
- `RuleApplyRun.beforeSnapshot / afterSnapshot / affectedAssignmentIds / status / appliedBy`
- `CoverageAlert.status = GENERATED → ACKNOWLEDGED → RESOLVED → ARCHIVED`
- `ExportJob.status = PENDING → PROCESSING → COMPLETED | FAILED → EXPIRED`
- `CalendarCellDisplaySetting.shortLabel / color / glowColor / cellDensity / overtimeDisplayMode`

---

## 12. API 規格

共通成功格式：

```json
{ "data": {}, "meta": { "requestId": "req_..." } }
```

共通錯誤格式：

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {} } }
```

### 12.1 必備 API

| Method | Path | 用途 |
|---|---|---|
| POST | `/api/auth/login` | 登入並發 httpOnly cookie/JWT |
| GET | `/api/auth/me` | 取得目前使用者 |
| POST | `/api/auth/logout` | 登出 |
| GET/POST | `/api/staff` | staff list/create |
| GET/PATCH/DELETE | `/api/staff/:id` | staff detail/update/delete |
| GET/POST | `/api/shift-types` | shift type list/create |
| GET/PATCH/DELETE | `/api/shift-types/:id` | shift type detail/update/delete |
| POST | `/api/ai/interpret` | 自然語言轉 structured action |
| POST | `/api/ai/preview-schedule` | 產生排班 preview |
| POST | `/api/ai/revise-preview` | 修正 preview |
| GET | `/api/ai/previews/:id` | 讀取 preview |
| POST | `/api/ai/apply-preview` | 確認套用 preview |
| POST | `/api/ai/apply-runs/:id/rollback` | rollback |
| POST | `/api/ai/explain-alert` | 解釋 coverage alert |
| POST | `/api/ai/export-command` | 自然語言觸發匯出 |
| GET | `/api/ai/conversations` | AI 對話列表 |
| GET/POST | `/api/swap-requests` | 調班 list/create |
| PATCH | `/api/swap-requests/:id/approve` | manager 核准/拒絕 |
| POST | `/api/schedule/multi-policy` | 同組織多制度並行 preview |
| POST | `/api/export/jobs` | 建立 export job |
| GET | `/api/export/jobs/:id` | 查 job 狀態 |
| GET | `/api/export/jobs/:id/download` | 下載匯出檔 |
| GET | `/api/calendar/google-fallback` | Google fallback 指引/連結 |
| GET | `/api/calendar/ics` | ICS 檔 |
| GET/POST | `/api/calendar/last-known` | 離線最後已知班表 |

---

## 13. AI Solver / Rule Engine 規格

權威文件：`AI_SOLVER_SPEC.md`、`MOCK_AI_BEHAVIOR_SPEC.md`、`SHIFT_PATTERNS_SEMANTIC_LIBRARY.md`。

Rule Engine 是 AI tool layer，不是前端規則表單。不得 hard-code 固定時間、固定週期、固定 A/B 班或固定每日班數。所有排班制度必須轉成 `semanticRules + constraints`，再產生 assignments preview、conflicts、coverage warnings。

必須支援：

- 固定班：daily / weekly / selected weekdays / selected dates。
- 任意 work/off phase：做三休一、做二休二、做四休四、任意 N-on-M-off。
- 命名制度 seed：2-2-3、4-on-4-off、DuPont、Pitman、Panama、Continental；名稱只作可編輯 seed。
- 8h、10h、12h、跨日班、break requirement。
- split shift、on-call、compressed week。
- skill / role coverage、demand-driven coverage。
- holiday exceptions、unavailable windows、max hours、min rest、minimum coverage。

---

## 14. Calendar Projection / Overtime 規格

權威文件：`CALENDAR_PROJECTION_ALGORITHM.md`、`CALENDAR_SHIFT_DISPLAY_MODEL.md`、`CALENDAR_CELL_DISPLAY_SETTINGS_SPEC.md`、`OVERTIME_FLOW_SPEC.md`。

- Rule Engine 產生 preview 後必須同步產生 `CalendarDayProjection`。
- 加班是 optional display layer，不得覆蓋原制度班別。
- 加班 assignment 必須標記 `assignmentType='overtime'` 或 `isOvertime=true`，並保留 audit log。
- 使用者可在月曆右上、個人偏好、匯出設定選擇是否顯示加班資訊。

---

## 15. Coverage Engine 規格

- Coverage alert lifecycle：`generated → acknowledged → resolved → archived`。
- 每天每班檢查 requiredCount vs actualCount、overtime risk、back-to-back risk、unavailable staff assigned、holiday coverage missing。
- 加班補上或手動補人後自動重算並標記 resolved。
- 過期未處理 alert 轉 archived。
- Coverage 結果必須同時提供給 AI explanation、月曆 cell、Day Inspector。

---

## 16. Mock / Fallback 要求

無外部服務時仍要完整驗收：

- AI API Key 未設定：啟用 deterministic mock AI。
- Mock AI 必須支援固定班、做三休一、做四休四、2-2-3、A/B輪替、split shift、on-call、compressed week、技能覆蓋、補人、查缺班、匯出 PDF 等固定語句。
- Google Calendar OAuth 未設定：產出 ICS + 顯示匯入教學。
- PDF render 失敗：產出 HTML printable page。
- 農曆 API 不可用：使用 seed `lunar_days`。
- Email/Push 不可用：寫入 notifications table + UI 顯示。

---

## 17. Seed Data 規格

必須可一鍵建立 demo seed，至少包含：

- Organization：ShiftOps Demo Org。
- Location：Taipei Demo Store。
- Demo users：`manager@shiftops.local / manager2026`，另可有 admin/member。
- Staff：具備 manager/member、技能、availability、顏色。
- ShiftTypes：A班、B班、夜班、休假、待命、split shift 示例。
- Holidays/LunarDays：2026–2027，至少覆蓋 2026 年 5 月驗收。
- NamedPatternSeeds：2-2-3、4-on-4-off、DuPont、Pitman、Panama、Continental。
- CalendarCellDisplaySettings：早/夜/待命等可自訂 shortLabel/color/glow。
- Mock AI examples：ACCEPTANCE Script A–N 可重現的語句。

---

## 18. 權限矩陣摘要

完整權威矩陣見 `RBAC_MATRIX.md`。

| 功能 | Admin | Manager | Member |
|---|---:|---:|---:|
| 管理 users/org/settings | ✅ | ⚠️ 限本地點 | ❌ |
| Staff/ShiftType CRUD | ✅ | ✅ | ❌ |
| 產生 AI preview | ✅ | ✅ | ❌ |
| Apply preview / rollback | ✅ | ✅ | ❌ |
| 提出 swap request | ✅ | ✅ | ✅ |
| 核准 swap request | ✅ | ✅ | ❌ |
| Export | ✅ | ✅ | ⚠️ 個人範圍 |
| Audit 查看 | ✅ | ✅ | ❌ |

---

## 19. 測試要求

最低測試門檻：

- Unit：10+，涵蓋 parser、projection、coverage、overtime、date utils。
- API：10+，涵蓋 auth、AI preview/apply/rollback、staff、shift-types、swap、export、fallback。
- E2E：4+，涵蓋 login → AI preview → apply → calendar、swap workflow、export/offline、RBAC denial。
- Build：`node --run build` 必須 PASS。
- Lint：不得有阻斷性 warnings/errors。

---

## 20. Phase 拆分、完成定義與 QC 驗收標準

### Phase 0 — 專案與技術棧鎖定
- 完成定義：Next.js App Router + TS + Tailwind + Prisma skeleton；不得 Vite/Express。
- QC：可 build；README 寫明正式技術棧；無 PromptForge 汙染。

### Phase 1 — Auth/RBAC/Seed
- 完成定義：manager demo 可登入；JWT httpOnly cookie；RBAC guard；seed 可重建。
- QC：`manager@shiftops.local / manager2026` 登入成功；member apply preview 被拒。

### Phase 2 — Staff/Shift/Holiday Data Foundation
- 完成定義：staff、shift type、holiday/lunar seed CRUD/API 可用。
- QC：可新增人員與班別；2026 年 5 月節日/農曆顯示。

### Phase 3 — AI Solver Preview
- 完成定義：AI/mock AI 解析自然語言成 structured preview；Zod 驗證；preview 不寫正式班表。
- QC：Script A/B/G/H API/UI 可產生 preview、warnings、reason。

### Phase 4 — Calendar Projection / Day Inspector / OT
- 完成定義：preview/apply 產生 calendar projections；Day Inspector 顯示 ruleProjection、coverage、OT candidates。
- QC：不開 AI 可在 cell 看到 Expected Shift；OT overlay 可切換且不覆蓋原班別。

### Phase 5 — Apply/Rollback/Coverage/Audit
- 完成定義：apply 建 RuleApplyRun；rollback 可恢復；Coverage alert lifecycle 可重算；audit log 完整。
- QC：Script L 通過；coverage resolved/archived 行為可驗證。

### Phase 6 — Swap Workflow
- 完成定義：member 申請、AI 替代建議、manager 核准/拒絕、audit、calendar update。
- QC：Script D 通過；member 不可自動核准。

### Phase 7 — Export / Google Fallback / PWA Offline
- 完成定義：PDF/PNG/ICS export jobs；Google fallback；manifest/sw；last-known schedule。
- QC：Script E/F 通過；無 Google OAuth 仍有 ICS；離線 refresh 可看最後班表。

### Phase 8 — Settings / Display Customization / Billing Placeholder
- 完成定義：Calendar Display settings 可改 shortLabel/color/glow/density/OT mode；billing placeholder 顯示方案限制。
- QC：Script N 通過；不得 hard-code A/B 紅藍；不接金流。

### Phase 9 — Final Verification & Truth Pack
- 完成定義：unit/api/e2e/lint/build/live probes 全綠；RC/NEXT_STEP/TASK_META 同步；README 引用核心 spec。
- QC：ACCEPTANCE Script A–N 均可執行；不得只以單一測試 PASS 代替產品完整性。

---

## 21. QC 驗收腳本清單

權威腳本見 `ACCEPTANCE.md`。本規格要求至少通過：

- Script A：AI 排班預演與套用。
- Script B：AI 修正預演。
- Script C：AI 查缺口。
- Script D：AI 協助調班。
- Script E：AI 匯出。
- Script F：離線與 Mock AI。
- Script G：多制度並行與彈性 constraint。
- Script H：非固定週期與多段班。
- Script I：輪班制度與月曆呈現掛勾。
- Script J：加班可選顯示與填補。
- Script K：P0 補件驗證。
- Script L：權限與非同步流程。
- Script M：API Layer Acceptance。
- Script N：Calendar Display Settings。

---

## 22. 禁止事項 / 紅線

- 禁止混入 PromptForge 或提示詞生成內容。
- 禁止只交 MVP、prototype、partial Cloud Preview、mock-only 頁面。
- 禁止 AI 直接寫正式班表，必須 preview → confirm → audit → apply。
- 禁止缺少 mock AI fallback。
- 禁止無 seed data 導致驗收不可重現。
- 禁止把規則 hard-code 成固定 A/B 或固定每日班數。
- 禁止命名制度不可調整 phase/天數/班別/組別 offset。
- 禁止輪班制度只出現在 AI 文字或報表而未投影到月曆 cell。
- 禁止加班資訊強制顯示且不可切換，或覆蓋原制度班別。
- 禁止使用 `C:\WORK` 或 `/mnt/c/WORK` 作驗收入口。
- 禁止 PM 宣稱 Sebastian/Sebastian 或 Simon 已完成其工作。

---

## 23. 文件權威順序

若文件衝突，按以下順序處理：

1. `ACTIVE_PRODUCT_LOCK.json` — active product guard。
2. `PRODUCT_SPEC.md` — 本 PM 正規化產品規格。
3. `SPEC.md` — 技術規格來源。
4. `ACCEPTANCE.md` — QC 驗收腳本。
5. `AI_SOLVER_SPEC.md`、`CALENDAR_PROJECTION_ALGORITHM.md`、`PRISMA_SCHEMA_SPEC.md`、`MOCK_AI_BEHAVIOR_SPEC.md`、`RBAC_MATRIX.md`、`OVERTIME_FLOW_SPEC.md`。
6. `README.md` / `BUILD_EVIDENCE.md` — 開發與驗證說明。
7. `RC.md`、`NEXT_STEP.md`、`TASK_META.json` — workflow truth pack。

---

## 24. Sebastian 接手指令

Sebastian 收到本 `plan.ready` 後：

1. 僅處理 active task path：`/home/sport/WORK/AGENTS/04_打回修改/sebastian/20260428_shift_scheduler_web_supershift_style`。
2. 不得處理非 active product，不得混入 PromptForge。
3. 以 `PRODUCT_SPEC.md` + `ACCEPTANCE.md` + 核心補件為開發/修復權威。
4. 若仍在 returned_for_fix 狀態，需只補實作與證據，不重做 PM 規格。
5. 送 Simon 前必須更新 RC/NEXT_STEP/TASK_META，並具備 build/test/API/live/browser 證據。
6. 不得只因 webhook accepted 就宣稱完成或送驗。

---

## 25. PM 自檢收斂

- 規格完整性：已涵蓋產品名稱、目標使用者、核心痛點、功能範圍、頁面結構、流程、資料欄位、UI/UX、技術限制、Mock/Fallback、Seed、權限、API、測試、Phase 與禁止事項。
- 可開發性：已明確鎖定技術棧、API、資料模型、權威補件、路由與 phase 順序。
- 可驗收性：每個 phase 均有完成定義與 QC 驗收標準，並對應 ACCEPTANCE Script A–N。
- active lock：本次只處理 `20260428_shift_scheduler_web_supershift_style` active task path，未修改非 active product。

---

## 26. 本輪 PM 規格轉換結論

`SPEC.md` 已被正規化為 OP 可直接執行的 `PRODUCT_SPEC.md`。本文件不代表 OP 已完成修復，也不代表 QC 已通過；下一站狀態為 Sebastian 待處理。

---

## 27. PM scope reconciliation — 2026-04-30 11:41

Simon 最新 verdict 指出 `FULL_BUILD_CHECKLIST.md` 仍有未勾選項，導致 build.ready gate 不可通過。PM 已完成補充收斂：詳見 `PM_SCOPE_RECONCILIATION.md`。

本補充不縮小產品範圍、不把未勾選項移到未來版本；目前 active product 的送審標準仍為 Phase 0–9 完整整合 release。Sebastian 必須逐項完成或以等價證據正式收斂 checklist，並保持 `TEST_RESULT.md`、`FULL_BUILD_CHECKLIST.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json` 一致後，才可送 `build.ready`。


---

## 28. PM scope reconciliation — 2026-04-30 12:17 Auth contract addendum

Simon 最新 verdict `20260430T120614+0800_REJECTED` 已確認：除 `FULL_BUILD_CHECKLIST.md` 仍有 `[ ]=35` 未勾選項外，Auth/browser login contract 也阻擋 build.ready。

本規格維持原 Auth 要求：`JWT httpOnly cookie + RBAC`。因此 Phase 1 的完成定義與 QC 驗收標準補強如下：

- Login API 必須在 documented local entry `http://localhost:3000` 發出可被瀏覽器與同 origin fetch 使用的 `HttpOnly` session cookie。
- 使用相同 cookie jar 呼叫 `GET /api/auth/me` 必須回 200，不得只能靠 bearer token 通過。
- `/login` 瀏覽器表單填入 `manager@shiftops.local / manager2026` 後必須實際送出登入 request、設置 session cookie，並導向受保護或產品頁。
- 若改為 bearer-only，需先經 PM 規格變更；目前本版不降級為 bearer-only。

本補充不縮小範圍、不解除剩餘 checklist gate。Sebastian 必須修復 Auth contract、完成或逐項以證據收斂剩餘 checklist，並同步 `TEST_RESULT.md` / `FULL_BUILD_CHECKLIST.md` / `RC.md` / `NEXT_STEP.md` / `TASK_META.json` 後，才可重新送 `build.ready`。



---

## 29. PM scope reconciliation — 2026-04-30 12:51 Script M / Export Download / D Package addendum

Simon 最新 verdict `20260430T124744+0800_REJECTED` 已確認：Auth/browser login contract 已在該輪 QC 通過，但 build.ready 仍被以下 gate 阻擋。本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 仍為 `[x]=32`, `[ ]=35`，所有未勾選項仍是 Phase 9 release evidence gate。
2. Phase 3 / Script M：documented preview curl 只帶 `prompt/startDate/endDate/mockMode` 時不得 400；系統必須提供 backward-compatible normalization 或同步正式改寫 acceptance contract 並附測試證據。當前預設要求為照文件原樣 curl 回 structured `SolverPreview`。
3. Phase 7 / Export：`ExportJob.downloadUrl` 指向 `/api/export/jobs/<jobId>/download` 時，該 endpoint 必須存在並可下載對應 PDF/PNG/ICS；不得用 unrelated `/api/calendar/ics` 通過替代。
4. Phase 9 / Final Verification：Windows-visible D 槽 final-review package 必須與 source truth pack/build artifacts 同步，重新送審前需提供 freshness evidence。

本補充不解除剩餘 checklist gate。Sebastian 必須完成或逐項以證據收斂剩餘 checklist，修復 Script M 與 export download contract，同步 D package，並更新 `TEST_RESULT.md` / `FULL_BUILD_CHECKLIST.md` / `RC.md` / `NEXT_STEP.md` / `TASK_META.json` 後，才可重新送 `build.ready`。

---

## 30. PM scope reconciliation — 2026-04-30 13:24 checklist-only formal gate addendum

Simon 最新 verdict `20260430T131057+0800_REJECTED` 已確認：OP 已讓 clean API/build/live/browser/auth/Script-M/export download 相關 probes 多數通過，但正式 release gate 仍被 `FULL_BUILD_CHECKLIST.md` 與 truth pack 擋住。

本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 仍為 `[x]=32`, `[ ]=35`；所有未勾選項仍是 Phase 9 release evidence gate。
2. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. Sebastian 必須完成或逐項以 evidence path / command / probe result 正式收斂剩餘 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。
4. 重新送審前必須同步 D 槽 final-review package，保留 metadata + BUILD_ID/manifest freshness evidence，並重跑 clean build/unit/api/e2e/live/browser/auth/Script-M/export probes。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。


---

## 31. PM scope reconciliation — 2026-04-30 13:57 latest QC addendum

Simon 最新 verdict `20260430T135334+0800_REJECTED` 已確認：clean unit/api/e2e/build 與 live/browser/auth/Script-M/export/ICS probes 通過，但 formal release gate 仍未完成。

本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 目前為 `[x]=38`, `[ ]=29`；所有未勾選項仍是 Phase 9 release evidence gate。
2. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. D 槽 Windows-visible final-review package 必須同步最新 source truth pack metadata 與 final OP build/package freshness evidence，不能只保留舊 metadata。
4. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。
5. 重新送審前必須重跑並記錄 clean unit/api/e2e/build、production route/browser/auth/Script-M/export/ICS probes。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。


---

## 32. PM scope reconciliation — 2026-04-30 14:29 build/unit gate addendum

Simon 最新 verdict `20260430T141355+0800_REJECTED` 已確認：本輪阻擋點除 29 個 checklist evidence gate 與 D package freshness 外，新增/復現 clean build 與 unit gate 失敗。

本規格維持原產品範圍，不降版、不移出本版：

1. `node --run build` 與 `node --run db:generate && node --run build` 必須 clean exit_code=0；目前阻擋點為 `app/api/ai/report/coverage/route.ts:85:65` Prisma `ShiftAssignmentGetPayload` 型別錯誤。
2. `node --run test:unit` 必須 clean exit_code=0；目前 2 suites / 19 tests fail，來源為 `tests/api/setup.ts` 等待 `http://localhost:3000/` readiness timeout。Unit tests 不得依賴未啟動的 external server。
3. `FULL_BUILD_CHECKLIST.md` 仍為 `[x]=38`, `[ ]=29`；所有未勾選項仍是 Phase 9 release evidence gate。
4. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
5. D 槽 Windows-visible final-review package 必須重包並同步 source metadata / checklist counts / BUILD_ID / manifest freshness evidence。
6. Sebastian 修復後需重跑 clean build/unit/api/e2e/live/browser/auth/Script-M/export probes，並同步 `TEST_RESULT.md`、`FULL_BUILD_CHECKLIST.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。

---

## 33. PM scope reconciliation — 2026-04-30 15:03 latest QC addendum

Simon 最新 verdict `20260430T144146+0800_REJECTED` 已確認：clean build/unit/api/e2e、required production routes、browser login、cookie auth、AI preview/apply/rollback、ICS/export download 等 probes 有通過證據，但 formal release gate 仍未完成。

本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 目前 source raw count 為 `[x]=43`, `[ ]=24`；所有未勾選項仍是 Phase 9 release evidence gate。
2. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. D 槽 Windows-visible final-review package 必須重包並同步 source metadata / checklist counts / TEST_RESULT / RC / TASK_META / NEXT_STEP / build artifact freshness evidence。
4. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。
5. 重新送審前必須重跑並記錄 clean build/unit/api/e2e、production live route、browser login、auth cookie、AI preview/apply/rollback、export job/download、PWA/offline/fallback probes。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 11。

---

## 34. PM scope reconciliation — 2026-04-30 15:05 latest QC addendum

Simon 最新 verdict `20260430T150310+0800_REJECTED` 已確認：clean build/unit/api/e2e、production routes、browser login、auth cookie、AI preview/apply/rollback、export download、ICS/google fallback 均有通過證據，但 formal release gate 仍未完成。

本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 目前 source line-count 為 `[x]=43`, `[ ]=24`；所有未勾選項仍是 Phase 9 release evidence gate。
2. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. D 槽 Windows-visible final-review package 必須重包並同步 source metadata / checklist counts / TEST_RESULT / RC / TASK_META / NEXT_STEP / BUILD_ID / manifests freshness evidence。
4. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 12。



---

## 35. PM scope reconciliation — 2026-04-30 15:38 latest source-state addendum

Simon 最新 verdict `20260430T152451+0800_REJECTED` 已確認：clean build/unit/api/e2e 與多數 live/browser/auth/AI/export probes 有通過證據，但 formal release gate 仍未完成；此外 audit persistence warnings 與 D package freshness 仍阻擋重新送審。

本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 目前 source raw count 為 `[x]=46`, `[ ]=21`；所有未勾選項仍是 Phase 9 release evidence gate。
2. `TEST_RESULT.md` / truth pack 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. audit persistence warnings / D42 audit 缺口必須修復或以持久化證據正式收斂；API PASS 但 stdout 有 persistence failure 不可視為完成。
4. D 槽 Windows-visible final-review package 必須重包並同步 source metadata / checklist counts / TEST_RESULT / RC / TASK_META / NEXT_STEP / BUILD_ID / manifests freshness evidence。
5. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 13。


---

## 36. PM scope reconciliation — 2026-04-30 16:12 latest QC addendum

Simon 最新 verdict `20260430T160929+0800_REJECTED` 已確認：clean build/unit/api/e2e、production routes、browser login、cookie auth 與 export smoke probes 有通過證據，但 formal release gate 仍未完成。

本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 目前 source raw count 為 `[x]=46`, `[ ]=21`；所有未勾選項仍是 Phase 9 release evidence gate。
2. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. D package 已存在且 checklist count 與 source 同為 `[x]=46`, `[ ]=21`；若後續 clean build 造成 BUILD_ID drift，Sebastian 重新送審前仍必須刷新 D package 並附 freshness evidence。
4. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。
5. 重新送審前必須重跑並記錄 clean build/unit/api/e2e、production routes、browser login、auth cookie、AI preview/apply/rollback、export job/download、ICS/google fallback/PWA probes。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 14。

---

## 37. PM scope reconciliation — 2026-04-30 16:44 build-regression gate addendum

Simon 最新 verdict `20260430T163401+0800_REJECTED` 已確認：本輪 clean production build 失敗，且 API/E2E 因 build/server readiness 不成立而失敗；因此不得以先前綠燈或 D package 舊 artifact 取代本輪 source gate。

本規格維持原產品範圍，不降版、不移出本版：

1. `app/api/ai/coverage-summary/route.ts` 必須修復 duplicate `shiftTypes` / `shiftTypeMap` 宣告與任何 Prisma include/type regression；`node --run build` 必須 clean exit_code=0。
2. `node --run test:unit`、`node --run test:api`、`node --run test:e2e` 必須 clean exit_code=0；不得有 server lifecycle/open-handle/timeout 警訊。
3. `FULL_BUILD_CHECKLIST.md` 目前 source raw count 為 `[x]=46`, `[ ]=21`；所有未勾選項仍是 Phase 9 release evidence gate。
4. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
5. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。
6. 重新送審前必須刷新 D 槽 final-review package，並記錄 source/D truth pack、`.next/BUILD_ID`、manifest、mtime/size freshness evidence。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 15。



---

## 38. PM scope reconciliation — 2026-04-30 16:58 latest QC addendum

Simon 最新 verdict `20260430T165835+0800_REJECTED` 已確認：clean build/unit/api/e2e、production routes、browser login/cookie auth、protected calendar probes、AI preview/apply/rollback、export PDF/PNG/ICS download 均有通過證據，但 formal release gate 仍未完成。

本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 目前 source raw count 為 `[x]=46`, `[ ]=21`，P0 unchecked=0；所有未勾選項仍是 Phase 9 release evidence gate。
2. `TEST_RESULT.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. D 槽 Windows-visible final-review package 雖存在 executable contents，但 truth-pack metadata 舊於 source；重新送審前必須刷新 D package 並附 `.next/BUILD_ID` / manifest / mtime-size freshness evidence。
4. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。
5. 重新送審前必須重跑並記錄 clean build/unit/api/e2e、production routes、browser login、auth cookie、calendar projection/day-inspector/google fallback、AI preview/apply/rollback、export job/download、ICS/PWA probes。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 16。

---

## 39. PM scope reconciliation — 2026-04-30 17:53 latest QC/source recount addendum

Simon 最新 verdict `20260430T174127+0800_REJECTED` 已確認：clean build/unit/api/e2e、production routes、browser login/cookie auth、protected calendar/export/ICS probes 有通過證據，但 formal release gate 仍未完成。

本規格維持原產品範圍，不降版、不移出本版：

1. Simon 報告記錄 checklist raw count `[x]=48`, `[ ]=19`；PM 本輪重新讀取目前 source `FULL_BUILD_CHECKLIST.md` 後，行首 checklist count 為 `[x]=56`, `[ ]=11`。後續 Sebastian 交付以目前 source 未勾選項與 item-level evidence 為準。
2. `TEST_RESULT.md` / `TASK_META.json` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
3. D 槽 Windows-visible final-review package metadata 必須刷新並與 source truth pack/build artifacts 同步，包含 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`、`.next/BUILD_ID`/manifest freshness evidence。
4. Sebastian 必須逐項補上 evidence path / command / probe result 後再勾選 checklist，並同步 truth pack；不得只以 build/test 綠燈替代產品完整性 gate。
5. 重新送審前必須重跑並記錄 clean build/unit/api/e2e、production routes、browser login、auth cookie、calendar projection/day-inspector/google fallback/last-known、AI preview/apply/rollback、export job/download、ICS/PWA probes。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 17。


---

## 40. PM scope reconciliation — 2026-04-30 18:26 latest QC/source recount addendum

Simon 最新 verdict `20260430T180214+0800_REJECTED` 已確認：clean build/unit/api/e2e、production routes、browser login/cookie auth、protected calendar/export probes 有通過證據，但 formal release gate 仍未完成。

本規格維持原產品範圍，不降版、不移出本版：

1. Simon 報告記錄 checklist raw count `[x]=56`, `[ ]=11`；PM 本輪重新讀取目前 source `FULL_BUILD_CHECKLIST.md` 後，行首 checklist count 為 `[x]=59`, `[ ]=8`。後續 Sebastian 交付以目前 source 未勾選項與 item-level evidence 為準。
2. 剩餘未勾選項仍是 Phase 9 release evidence gate / P0 release gate；不得只以 build/test 綠燈替代產品完整性 gate。
3. `TEST_RESULT.md` / `TASK_META.json` / `RC.md` 仍標示 `all_must_fix_completed=false`、`ready_for_build_ready=false`；此狀態下不得送 `build.ready`。
4. Sebastian 必須逐項補 evidence path / command / probe result 後再勾選 checklist，並同步 `FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。
5. 重新送審前必須刷新 D 槽 final-review package，並重跑 clean build/unit/api/e2e、production routes、browser login、auth cookie、calendar projection/day-inspector/google fallback/last-known、AI preview/apply/rollback、export job/download、ICS/PWA probes。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 18。



---

## 41. PM scope reconciliation — 2026-04-30 18:59 latest QC / 4-item gate addendum

Simon 最新 verdict `20260430T185010+0800_REJECTED` 已確認：目前阻擋不是產品方向不明，而是 OP delivery evidence gate 尚未完成。本規格維持原產品範圍，不降版、不移出本版：

1. `FULL_BUILD_CHECKLIST.md` 目前 source raw count 為 `[x]=63`, `[ ]=4`, P0 unchecked=0；剩餘 C26、D38、I75、J84 仍是 Phase 9 release evidence gate。
2. `node --run test:unit` 目前因 `tests/unit/constraint-parsing.test.ts` 4 failures 不通過；技能/資格/角色 constraint 必須在 explanation/warnings 與排班邏輯中可驗證，不能只停留在 mock keyword parsing。
3. D38 缺班警告 badge 必須對齊 `CoverageAlert` persistence/API 或正式 projection source，不得只用 UI heuristic。
4. I75 `AI_SOLVER_SPEC.md` 必須落實 solver interface / deterministic scoring pipeline 或以逐章證據正式對賬。
5. J84 整合 gate 必須等 C26、D38、I75 均完成、unit/api/e2e/build/live/browser/API probes 與 D package freshness 全部同步後才可勾選。
6. Auth cookie/session contract 與 D package freshness 仍屬 OP resubmit evidence；若要把 Auth 從 httpOnly cookie 改為 bearer-only，需另提正式規格變更，當前 PM 不批准隱性降版。
7. 本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 19。


---

## 42. PM scope reconciliation — 2026-04-30 19:34 post-OP closure check

PM 已重新讀取 active lock、最新 Simon rejected 報告、`FULL_BUILD_CHECKLIST.md`、`TEST_RESULT.md`、`RC.md`、`NEXT_STEP.md`、`TASK_META.json`。本輪判定如下：

1. 本 active product 仍維持 `PRODUCT_SPEC.md` Phase 0–9 原完整範圍；不降版、不移出本版、不新增需求。
2. 目前 source `FULL_BUILD_CHECKLIST.md` 重新計數為 `[x]=67`, `[ ]=0`；`TEST_RESULT.md` / `RC.md` / `NEXT_STEP.md` 已由 OP 標示 `all_must_fix_completed=true`、`ready_for_build_ready=true`、`next_agent=simon`、`next_event=build.ready`。
3. 最新 QC rejected 報告 `20260430T191252+0800_REJECTED` 所列 D38/I75/J84 與 D package freshness 已由 OP 後續 truth pack 宣告收斂；PM 僅確認目前沒有新的 PM scope reconciliation blocker。
4. `TASK_META.json` / `RC.md` / `NEXT_STEP.md` 在本輪 PM 寫回前已顯示 Simon `review.done` / `APPROVED`，報告為 `_simon_review_records/20260430T193418+0800_APPROVED.md`；PM 不代替 QC 驗收，只記錄已觀察到的 truth-pack 狀態。

本補充不執行開發或驗收；PM 只完成規格/範圍自檢並保持 scope 不變。


---

## 43. PM scope reconciliation — 2026-04-30 21:11 D final-review package gate addendum

Simon 最新 verdict `20260430T210827+0800_REJECTED` 已確認：source build/unit/api/e2e/live/browser/auth/export probes 通過，`FULL_BUILD_CHECKLIST.md` 目前 source count 為 `[x]=67`, `[ ]=0`, P0 unchecked=0；但正式 Windows-visible final-review package 缺失於 `D:\WORK\成品區\待最終審核\sebastian\20260428_shift_scheduler_web_supershift_style`，且僅存在 `_退回修改` package，其 BUILD_ID / truth-pack metadata freshness 與 source 不一致。

本規格維持原產品範圍，不降版、不新增需求、不把正式待審 D package gate 移出本版：

1. Phase 9 Final Verification & Truth Pack 必須包含 fresh source/D package 一致性 evidence。
2. Sebastian 必須重新產出並同步正式待審 D package，而不得以 `_退回修改` package 取代 `待最終審核` 入口。
3. 重新送審前必須清除 truth-pack 中 approved vs returned/not_publishable 的矛盾，並確保 `TASK_META.json`、`RC.md`、`NEXT_STEP.md`、`TEST_RESULT.md`、`FULL_BUILD_CHECKLIST.md` 與 D package metadata/build artifacts 一致。
4. `all_must_fix_completed=false`、`ready_for_build_ready=false`、`next_agent=sebastian`、`next_event=null` 在 OP 完成 fresh package 與重驗證前必須保持。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 21。


---

## 44. PM scope reconciliation — 2026-04-30 22:46 formal D final-review package gate addendum

Simon 最新 verdict `20260430T223950+0800_REJECTED` 已確認：source clean build/unit/api/e2e/live/browser/auth/export probes 通過，`FULL_BUILD_CHECKLIST.md` 目前 source count 為 `[x]=67`, `[ ]=0`, P0 unchecked=0；但正式 Windows-visible final-review package 缺失於 `D:\WORK\成品區\待最終審核\sebastian\20260428_shift_scheduler_web_supershift_style`。`_退回修改` 歷史 package 不是正式 final-review 入口，不能作為 QC 放行依據。

本規格維持原產品範圍，不降版、不新增需求、不把正式待審 D package gate 移出本版：

1. Phase 9 Final Verification & Truth Pack 必須包含 fresh source/D package 一致性 evidence。
2. Sebastian 必須重新產出並同步正式待審 D package，而不得以 `_退回修改` package 取代 `待最終審核` 入口。
3. 正式 package 必須包含可執行 Web/Next.js 產品內容（至少 `package.json`、`app/`/`src`、`public`、`.next` 或等價 production package），不可只有 truth-pack metadata。
4. 重新送審前必須同步 `RC.md`、`NEXT_STEP.md`、`TEST_RESULT.md`、`TASK_META.json`、`FULL_BUILD_CHECKLIST.md` 與 D package metadata/build artifacts，並提供 BUILD_ID/manifest/mtime/hash freshness evidence。
5. `all_must_fix_completed=false`、`ready_for_build_ready=false`、`next_agent=sebastian`、`next_event=null` 在 OP 完成 fresh package 與重驗證前必須保持。

本補充不代表 OP 已完成，也不代表 QC 已通過；下一責任仍為 Sebastian OP。詳見 `PM_SCOPE_RECONCILIATION.md` section 22。
