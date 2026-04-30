# 班表中樞 ShiftOps Calendar — 開發提案 proposal_full.md



## 第0節：一次性完整開發原則（Jason 校正）

本案必須是「完整版規劃開發」。Sebastian 接手時要一次完成可從頭做到尾的完整產品閉環，不能拆成先小做、後補齊。完整內容包含：

1. 使用者登入與角色權限。
2. 人員、班別、假日、農曆基礎資料。
3. 月曆主控台與日詳情 Inspector。
4. 新增、編輯、刪除班次。
5. AI 排班助理：自然語言產生班表、預演、修正、套用。
6. AI 解釋覆蓋率、缺班、超時、衝突警告，並在月曆內嵌標記。
7. 調班申請與審核。
8. 報告頁與異常清單。
9. 分享與列印中心：PDF、PNG、ICS、Google Calendar fallback。
10. PWA、離線最後班表、README、seed data、完整測試與驗收腳本。

本規格允許在施工順序上分批實作，但不允許把產品拆成多輪交付；每個整合施工順序都是為了完成同一個完整版產品，不是分段開發規格。

---


## 第0A節：權威技術棧與補件文件（2026-04-28 修正）

本案正式技術棧以 `SPEC.md` 與 `PRISMA_SCHEMA_SPEC.md` 為準：Next.js 15 App Router + TypeScript + Tailwind CSS + PostgreSQL + Prisma + Route Handlers。本文舊段落若出現 React 18 + Vite / Express.js / 簡化 SQL schema，視為歷史草稿，不得作為開工依據。

新增權威補件：
- `AI_SOLVER_SPEC.md`
- `CALENDAR_PROJECTION_ALGORITHM.md`
- `OVERTIME_FLOW_SPEC.md`
- `RBAC_MATRIX.md`
- `PRISMA_SCHEMA_SPEC.md`
- `MOCK_AI_BEHAVIOR_SPEC.md`

---


## 第0B節：單一整合開發原則（Jason 2026-04-28 校正）

本案不得拆工。不得把 UI、AI、solver、projection、overtime、schema、export 分成多個獨立子案或半成品交付。正式開發必須是單一 repo、單一 schema、單一 API contract、單一整合驗收、一次性完整交付。

允許內部依賴順序，但不得轉成分段產品、分批驗收或多人分拆責任。詳見 `INTEGRATED_EXECUTION_PRINCIPLE.md`。

---

## 第1節：產品定位與願景

**產品名稱：** 班表中樞 ShiftOps Calendar  
**產品類型：** Web / PWA（漸進式網頁應用）  
**核心定位：** 給門市、診所、輪班團隊使用的排班一體化工作台；核心不是漂亮月曆，而是「排班、查缺口、調人力、匯出」的專業工具。

**非功能範圍：**
- 不做 AI SaaS 浮誇首頁，但必須做 AI 排班助理與 AI 編排引擎
- 不做大型 ERP 模組
- 不混入 PromptForge 相關功能
- 保持工具型專業感

**核心價值鏈：**
自然語言意圖 → AI 排班預演 → 人類確認 → 月曆寫入 → 缺口解釋 → 調班建議 → 匯出分享

---

## 第2節：視覺語言與設計系統

### 色彩系統
```
--bg: #000000
--surface: #202020
--surface-2: #242426
--divider: #111113
--text: #FFFFFF
--muted: rgba(255,255,255,.45)
--selected-day: #1F2F66
--shift-a: #FF5368
--shift-b: #3DAEF2
--event-dot: #FF9500
--accent-blue: #007AFF
--tab-active: #4A4A4D
--fab-bg: #F2F2F2
--fab-icon: #1A1A1A
--warning: #FF9500
--danger: #FF3B30
--success: #34C759
```

### 字體
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang TC", "Noto Sans TC", Inter, system-ui, sans-serif;
```

### 圓角與間距
- App shell：黑底滿版
- 主要容器 max-width：1180–1320px
- 手機設定頁 max-width：640–720px
- 大卡片 radius：32–56px
- 底部 tab radius：999px
- Row 高度：mobile 88–104px；desktop 104–128px


---

## 第2A節：AI-first 功能重構原則

Jason 指出：AI 編排能力很強，許多制式功能會被 AI 取代。因此本案改為 AI-first 排班工具，不再把 AI 當附屬功能。

### AI 取代的制式功能
| 原制式功能 | AI 取代方式 | 底層保留 |
|---|---|---|
| 規則建構器表單 | 使用者用自然語言描述規則，AI 產生排班預演 | Rule Engine / preview |
| 規則模板庫 | AI 內建「做三休一」「A/B輪替」「假日例外」語意 | rule_templates 作為 examples |
| 新增/編輯班次 Modal | 對話或 inline edit：「5/1 A班改小林」 | shift_assignments CRUD |
| 獨立 Alerts 頁 | AI 主動在月曆與 Inspector 標記異常 | coverage_alerts |
| 傳統報告頁 | AI 問答：「本月缺口在哪？」並附圖表 | coverage / hours calculations |
| 匯出 wizard | AI 指令：「匯出5月PDF含備註」 | export engine |

### AI 不可取代的底座
- 登入 / RBAC / 權限。
- 人員、班別、假日、農曆基礎資料。
- 工時計算、覆蓋率、衝突檢查。
- 調班核准的人類決策。
- PDF / PNG / ICS / Google Calendar 格式合約。
- Audit log 與 rollback。

### AI 寫入安全原則
AI 不得直接改正式班表；必須先產生 preview，由 manager 確認後才 apply。所有 AI action 必須寫入 `ai_action_logs` 與 `audit_events`。

---

## 第3節：頁面架構（AI-first 完整版）

| # | 路由 | 頁面名稱 | 核心功能 |
|---|------|----------|----------|
| 1 | `/calendar` | AI 月曆主控台 | 月曆、AI Assistant Panel、Day Inspector、KPI、inline edit |
| 2 | `/ai-assist` | AI 排班助理 | 對話、排班預演、修正、套用、歷史紀錄 |
| 3 | `/calendar/day/:date` | 日詳情 Inspector | 當日班次、人員、AI 警告解釋、快速修正 |
| 4 | `/data/staff` | 人員資料底座 | 員工 CRUD、不可用日期、角色、偏好 |
| 5 | `/data/staff/:id` | 人員詳情 | 個人工時、歷史班次、AI 偏好記憶 |
| 6 | `/data/shifts` | 班別資料底座 | A班/B班/休假/支援班、時間、顏色、最低覆蓋 |
| 7 | `/data/holidays` | 假日農曆資料 | 國定假日、農曆、節氣、例外日 |
| 8 | `/swap-requests` | 調班審核 | AI 建議替代人選，人類核准/拒絕 |
| 9 | `/reports` | AI 報告問答 | 覆蓋率、工時、缺口、異常摘要與圖表 |
| 10 | `/export` | AI 匯出中心 | 自然語言匯出 PDF/PNG/ICS/Google Calendar fallback |
| 11 | `/export/history` | 匯出歷史 | 下載、重產、分享連結 |
| 12 | `/settings` | 設定 | 偏好、通知、PWA、AI mock mode |
| 13 | `/billing` | 訂閱方案 | 方案限制、用量、付費牆 |
| 14 | `/audit` | 操作紀錄 | 人工與 AI 操作 audit log、rollback |
| 15 | `/ai/previews/:id` | AI 預演詳情 | proposed assignments、warnings、diff、apply/discard |
| 16 | `/notifications` | 通知中心 | AI 主動提醒、調班結果、匯出完成 |

---

## 第4節：核心資料模型（Next.js / Prisma 權威版）

本案不再使用舊版 flat TypeScript model 作為工程權威。資料模型權威來源為：

- `PRISMA_SCHEMA_SPEC.md`：Prisma schema、關聯、索引、enum、multi-tenant scope。
- `SPEC.md`：頁面 / Route Handler / domain module 對應。
- `AI_SOLVER_SPEC.md`：solver input/output contract。
- `CALENDAR_PROJECTION_ALGORITHM.md`：rule → date cell projection contract。

### 4.1 最小必做 domain aggregates

Sebastian 實作時必須以 PostgreSQL + Prisma schema 為準，並確保以下模型具備 `organizationId`；涉及店點 / 班表範圍者也必須具備 `locationId`：

1. Identity / tenant：`User`、`Organization`、`Membership`、`Location`。
2. Staff data：`StaffProfile`、`StaffAvailabilityWindow`、`StaffSkillCertification`、`StaffPreferenceMemory`。
3. Shift rules：`ShiftType`、`NamedPatternSeed`、`SchedulePolicyProfile`、`ShiftRule`、`ShiftRuleConstraint`、`DemandForecast`。
4. Calendar projection：`CalendarDayProjection`、`ShiftAssignment`、`ShiftAssignmentSegment`。
5. AI workflow：`AiConversation`、`AiMessage`、`AiSchedulePreview`、`AiActionLog`、`RuleApplyRun`。
6. Coverage / overtime：`CoverageAlert`、`OvertimeCandidate`、`OvertimeAssignment`。
7. Export / audit：`ExportJob`、`Notification`、`AuditLog`。

### 4.2 工程約束

- 不得再建立 `/client` + `/server` split model。
- 不得使用 `Staff`, `ShiftRule`, `ShiftAssignment` 的舊版簡化 interface 當資料庫合約。
- `shift_assignments` 必須支援 split shift：一筆 assignment 可有多筆 `ShiftAssignmentSegment`。
- 加班不得覆蓋原制度班別：使用 `OvertimeCandidate` / `OvertimeAssignment` 與 audit log 表示。
- 月曆 cell 顯示不得即時計算到不可追蹤；必須可由 `CalendarDayProjection` 重建 / 快取 / diff。

---

## 第5節：資料庫結構（Prisma schema 權威）

資料庫結構以 `PRISMA_SCHEMA_SPEC.md` 為唯一權威。此處只保留實作準則，避免與 schema 文件分叉。

### 5.1 必備特性

- PostgreSQL + Prisma migration。
- UUID primary key。
- 所有核心表必須有 `createdAt` / `updatedAt`；正式寫入需留 audit trail。
- 多租戶欄位：`organizationId` 為核心 scope；排班/班別/人員/假日/投影/缺口/加班需含 `locationId`。
- AI preview 與正式 apply 必須分離：preview 不可直接污染正式班表。
- `RuleApplyRun` 必須記錄 `beforeSnapshot`、`afterSnapshot`、`previewId`、`appliedBy`、狀態與 rollback metadata。

### 5.2 不再採用的舊設計

以下舊設計已廢棄，不得交給 Sebastian 實作：

- 直接在 proposal 中維護 raw SQL `CREATE TABLE` 清單。
- `weekly_templates` 作為主要排班規則來源。
- 只用 `staff_preferences(day_of_week)` 表示可用性。
- 只用 `coverage_alerts.is_resolved` 表示缺口生命週期；正式版本需支援 generated → acknowledged → resolved → archived。

### 5.3 schema 驗收

Sebastian 交付時至少要能通過：

```bash
npx prisma validate
npx prisma migrate dev --name init
npx prisma db seed
```

並能用 seed data 驗證：固定班、N-on-M-off、2-2-3、split shift、on-call、compressed week、skill coverage、overtime candidates、calendar projection。

## 第6節：API 設計（14+ APIs）

### 6.1 班次與排班

```
GET    /api/shifts/types           取得所有班別
POST   /api/shifts/types           新增班別
PUT    /api/shifts/types/:id       更新班別
DELETE /api/shifts/types/:id       刪除班別

GET    /api/assignments            取得班次列表（支援 date range, staff_id filter）
POST   /api/assignments            新增班次
PUT    /api/assignments/:id        更新班次
DELETE /api/assignments/:id        刪除班次
POST   /api/assignments/bulk      順序新增/更新班次（依規則生成）
```

### 6.2 人員

```
GET    /api/staff                  取得人員列表
POST   /api/staff                  新增人員
PUT    /api/staff/:id              更新人員
DELETE /api/staff/:id              刪除人員
GET    /api/staff/:id/schedule     取得個人班表
```

### 6.3 規則引擎

```
GET    /api/rules                  取得規則列表
POST   /api/rules                  新增規則
PUT    /api/rules/:id              更新規則
DELETE /api/rules/:id              刪除規則
POST   /api/rules/preview          預覽規則產生的班次（不儲存）
POST   /api/rules/generate         依規則生成班次（儲存）
```

### 6.4 報告與覆蓋

```
GET    /api/reports/coverage       人力覆蓋報告（heat map data）
GET    /api/reports/hours          工時統計
GET    /api/alerts                 異常清單（衝突、超時、缺口）
POST   /api/alerts/:id/resolve     標記為已處理
```

### 6.5 匯出

```
POST   /api/export/pdf             匯出 PDF
POST   /api/export/png             匯出 PNG
GET    /api/export/ics/:start/:end 取得 ICS 檔案
POST   /api/export/google          同步至 Google Calendar
GET    /api/export/history         匯出歷史
```

### 6.6 調班

```
POST   /api/swaps                  申請調班
GET    /api/swaps                  調班列表
PUT    /api/swaps/:id              審核調班（核准/拒絕）
```

### 6.7 假日

```
GET    /api/holidays               取得假日列表
POST   /api/holidays               新增假日
PUT    /api/holidays/:id           更新假日
DELETE /api/holidays/:id           刪除假日
GET    /api/holidays/lunar/:year   取得指定年份農曆資料
```


### AI API（必做）
1. `POST /api/ai/interpret` — 自然語言解析。
2. `POST /api/ai/preview-schedule` — 產生排班預演。
3. `POST /api/ai/revise-preview` — 用自然語言修正預演。
4. `POST /api/ai/apply-preview` — 人類確認後套用。
5. `POST /api/ai/explain-alert` — 解釋缺班/超時/衝突。
6. `POST /api/ai/export-command` — 口語匯出指令。
7. `GET /api/ai/conversations` — 對話歷史。
8. `GET /api/ai/previews/:id` — 預演詳情。

---

## 第7節：API JSON 範例

### 7.1 建立班次

```json
// POST /api/assignments
{
  "date": "2026-05-01",
  "staffId": "550e8400-e29b-41d4-a716-446655440001",
  "shiftTypeId": "550e8400-e29b-41d4-a716-446655440010",
  "ruleId": "550e8400-e29b-41d4-a716-446655440020",
  "note": "替換小明"
}
```

### 7.2 回應（成功）

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440099",
    "date": "2026-05-01",
    "staffId": "550e8400-e29b-41d4-a716-446655440001",
    "shiftTypeId": "550e8400-e29b-41d4-a716-446655440010",
    "ruleId": "550e8400-e29b-41d4-a716-446655440020",
    "note": "替換小明",
    "status": "confirmed",
    "createdAt": "2026-04-28T00:00:00Z"
  }
}
```

### 7.3 人力覆蓋報告

```json
// GET /api/reports/coverage?start=2026-05-01&end=2026-05-31
{
  "success": true,
  "data": {
    "period": { "start": "2026-05-01", "end": "2026-05-31" },
    "coverage": [
      {
        "date": "2026-05-01",
        "shiftTypeId": "550e8400-e29b-41d4-a716-446655440010",
        "shiftTypeName": "A班",
        "required": 3,
        "assigned": 2,
        "coverageRate": 0.67,
        "severity": "warning",
        "missingStaff": ["王小美", "陳大明"]
      }
    ],
    "summary": {
      "totalDays": 31,
      "warningDays": 5,
      "criticalDays": 2
    }
  }
}
```

### 7.4 規則預覽

```json
// POST /api/rules/preview
{
  "ruleId": "550e8400-e29b-41d4-a716-446655440020",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31"
}
```

```json
{
  "success": true,
  "data": {
    "preview": [
      { "date": "2026-05-01", "staffId": "550e8400-e29b-41d4-a716-446655440001", "shiftTypeId": "550e8400-e29b-41d4-a716-446655440010" },
      { "date": "2026-05-02", "staffId": "550e8400-e29b-41d4-a716-446655440002", "shiftTypeId": "550e8400-e29b-41d4-a716-446655440010" },
      { "date": "2026-05-03", "staffId": "550e8400-e29b-41d4-a716-446655440003", "shiftTypeId": "550e8400-e29b-41d4-a716-446655440010" }
    ],
    "conflicts": [],
    "warnings": []
  }
}
```

---

## 第8節：Mock Fallback 策略

Mock 不是靜態 JSON handler，也不是只 hard-code 一種「做三休一」。本案 mock 權威來源為 `MOCK_AI_BEHAVIOR_SPEC.md`，用於無外部 AI API key 時仍可完整驗收 AI-first 排班閉環。

### 8.1 Deterministic Mock Solver

- `POST /api/ai/interpret`：將自然語言轉成 structured semantic rules / constraints。
- `POST /api/ai/preview-schedule`：產出 `SolverPreview`，包含 `previewToken`、`status`、`proposedAssignments`、`calendarProjection`、`coverageAlerts`、`overtimeCandidates`、`explanations`、`warnings`。
- `POST /api/ai/revise-preview`：依自然語言調整 preview，不直接寫入正式班表。
- `POST /api/ai/apply-preview`：人類確認後建立 `RuleApplyRun` 與正式 assignments。

### 8.2 Mock 必須支援的語意範圍

1. 固定早/晚班與固定人員。
2. N-on-M-off：做三休一、做四休二、做四休四。
3. 2-2-3 / Panama / Pitman 類輪班 seed。
4. split shift：同一天多段 assignment segment。
5. on-call / standby：待命層與正式上班層分開。
6. compressed week：壓縮工時但週工時仍可檢查。
7. skill coverage：指定技能/證照需求。
8. overtime candidates：coverage gap → 候選人排序 → optional overlay。

### 8.3 Fallback 優先級

1. 有正式 AI provider：使用真實 provider，但仍套用 hard constraints validation。
2. 無 AI key 或測試環境：啟用 deterministic mock solver，回傳固定、可重現 payload。
3. provider 失敗：保留使用者輸入與 fallback preview，禁止靜默丟失。

---

## 第9節：Seed Data（初始資料）

Seed data 必須與 `PRISMA_SCHEMA_SPEC.md` 同步，不得使用 `s1`、`a`、`r1` 這類無 scope 的簡化 ID。

### 9.1 必備 seed scope

- `organizationId`: `org_shiftops_demo_20260428` 或 UUID。
- `locationId`: 至少一個示範店點 / 班別場域。
- users + memberships：manager、scheduler、member、viewer。
- staff profiles：至少 8 人，含技能、證照、偏好、可用時段。
- shift types：早班、晚班、夜班、休息、待命、加班。
- named pattern seeds：fixed、N-on-M-off、2-2-3、split shift、on-call、compressed week。
- policy profiles：週工時上限、連續工作日上限、週末最低人力、技能覆蓋。
- demand forecasts：一個月內至少 3 天高需求與 2 天缺口。
- deterministic mock prompts：每種制度至少一條可驗收自然語言。

### 9.2 Seed 驗收資料應覆蓋

- 月曆 projection 可顯示「今天是哪個班別 / 哪個制度 phase」。
- 同一天多制度並行時可切換 compact / lane / inspector detail。
- 缺口可生成 overtime candidates，而不是直接把加班寫回原制度班。
- `RuleApplyRun` 可保留 before/after snapshot 並支援 rollback。

Seed 實作位置：`prisma/seed.ts`。若 Sebastian 使用額外 fixture，需放在 `src/lib/demo-data/`，但不得取代 Prisma seed。

## 第10節：前端架構

### 10.1 技術棧

- **Framework:** Next.js 15 App Router + React 19 compatible setup（若實際模板仍為 React 18，需以 Next.js 支援版本為準）。
- **Language:** TypeScript strict mode。
- **Styling:** Tailwind CSS + CSS Variables / design tokens。
- **State:** TanStack Query（server state）+ Zustand（local UI state）。
- **Forms / Validation:** React Hook Form + Zod；API Route Handlers 也共用 Zod schema。
- **Date:** date-fns；農曆可用 seed data 或輕量套件封裝在 `src/lib/calendar/`。
- **Charts:** Recharts 或等價輕量 chart，用於 coverage / hours / demand forecast。
- **PDF:** server-side PDFKit 或 HTML printable fallback；不可依賴瀏覽器截圖作為唯一 PDF 方案。
- **ICS:** `ical-generator` 或等價 server-side ICS writer。
- **Tests:** Vitest + Playwright。

### 10.2 Next.js 目錄結構

```text
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── calendar/page.tsx
│   ├── calendar/[date]/page.tsx
│   ├── ai/previews/[id]/page.tsx
│   ├── coverage/page.tsx
│   ├── data/staff/page.tsx
│   ├── data/staff/[id]/page.tsx
│   ├── data/shifts/page.tsx
│   ├── data/holidays/page.tsx
│   ├── swap-requests/page.tsx
│   ├── reports/page.tsx
│   ├── export/page.tsx
│   ├── export/history/page.tsx
│   ├── settings/page.tsx
│   ├── billing/page.tsx
│   ├── audit/page.tsx
│   ├── notifications/page.tsx
│   └── api/
│       ├── ai/interpret/route.ts
│       ├── ai/preview-schedule/route.ts
│       ├── ai/revise-preview/route.ts
│       ├── ai/apply-preview/route.ts
│       ├── ai/previews/[id]/route.ts
│       ├── export/jobs/route.ts
│       └── export/jobs/[id]/route.ts
├── components/
│   ├── calendar/
│   ├── ai/
│   ├── coverage/
│   ├── export/
│   └── ui/
├── lib/
│   ├── prisma.ts
│   ├── auth/
│   ├── solver/
│   ├── calendar-projection/
│   ├── coverage/
│   ├── overtime/
│   ├── export/
│   └── demo-data/
└── types/
```

---

## 第11節：後端架構（Next.js Route Handlers）

### 11.1 技術棧

- **Runtime:** Node.js 20+ under Next.js 15。
- **Backend:** Next.js Route Handlers；不建立獨立 Express/Fastify server。
- **Database:** PostgreSQL + Prisma。
- **Auth:** session/JWT strategy 可由 Sebastian 選型，但 RBAC 必須符合 `RBAC_MATRIX.md`。
- **Validation:** Zod schema；API input/output 需與 `AI_SOLVER_SPEC.md`、`PRISMA_SCHEMA_SPEC.md` 對齊。
- **Background-ish jobs:** Demo 版可用 DB state machine 模擬 export job；若使用 queue，需可在本機免外部服務 fallback。

### 11.2 Domain services

```text
src/lib/
├── solver/
│   ├── interpret.ts
│   ├── deterministic-mock-solver.ts
│   ├── score-preview.ts
│   └── validate-hard-constraints.ts
├── calendar-projection/
│   ├── project-rule-to-days.ts
│   ├── phase-label.ts
│   └── compact-cell-display.ts
├── coverage/
│   ├── detect-gaps.ts
│   ├── alert-lifecycle.ts
│   └── demand-forecast.ts
├── overtime/
│   ├── candidate-engine.ts
│   └── apply-overtime-assignment.ts
├── export/
│   ├── pdf.ts
│   ├── ics.ts
│   └── export-job-state.ts
└── audit/
    └── rule-apply-run.ts
```

### 11.3 禁止的舊架構

- 不建立 `/server/src/routes/*.ts` Express app。
- 不建立 `/client/src/pages/*.tsx` React Router app。
- 不把 mock API 寫成與正式 API contract 不一致的 MSW-only handler。

## 第12節：農曆與假日整合

### 12.1 農曆資料來源

使用 `lunar-calendar` 或類似套件，或預先 seed 2026 年度農曆資料。

### 12.2 顯示邏輯

```typescript
// 在 CalendarCell 中
function CalendarCell({ date }) {
  const lunar = getLunar(date); // { month: 4, day: 15, isHoliday: false }
  const holiday = getHoliday(date); // { name: '端午', type: 'lunar' }

  return (
    <div>
      <span>{format(date, 'd')}</span>
      <span className="text-muted">{lunar.month}/{lunar.day}</span>
      {holiday && <HolidayMarker name={holiday.name} type={holiday.type} />}
    </div>
  );
}
```

### 12.3 國定假日識別

- Solar holiday：直接比對 date
- Lunar holiday：先查詢 lunar_calendar 表，再映射至 solar date

---

## 第13節：覆蓋警告邏輯

### 13.1 警告觸發條件

1. 單日某班別需求人數 > 實際排班人數
2. 單日總工時超過法定上限（8 小時 x 人數）
3. 個人週工時超過 40 小時
4. 連續排班超過 6 天

### 13.2 警告級別

```typescript
type AlertSeverity = 'info' | 'warning' | 'critical';

const checkCoverage = (assignments: ShiftAssignment[], shiftTypes: ShiftType[], staff: Staff[]): CoverageAlert[] => {
  // 計算每日每班別覆蓋率
  // 超過閾值則產生警告
  // 回傳 alerts 陣列含 severity 等級
};
```

---

## 第14節：匯出功能規格

### 14.1 PDF / Printable 匯出

- 預設 server-side PDFKit 產生 PDF；若 PDFKit 失敗，提供 server-rendered printable HTML fallback。
- 支援：A4 橫向/直向、日期範圍、店點、頁首、班別 legend、加班 overlay 顯示選項。
- PDF 內容必須從已套用的正式班表與 `CalendarDayProjection` 生成，不得只截取目前瀏覽器畫面。

### 14.2 PNG 匯出

- PNG 可作為瀏覽器端便利功能，但不得是正式 PDF 的唯一來源。
- 支援 2x 解析度與 dark mode 背景檢查；若瀏覽器截圖失敗，仍需保留 printable HTML。

### 14.3 ICS 匯出

```typescript
// src/lib/export/ics.ts
import ical from 'ical-generator'

export function generateShiftOpsICS(input: {
  assignments: AppliedShiftAssignment[]
  projections: CalendarDayProjection[]
  timezone: string
}) {
  const calendar = ical({ name: 'ShiftOps Calendar' })
  for (const assignment of input.assignments) {
    calendar.createEvent({
      id: `${assignment.id}@shiftops.calendar`,
      summary: assignment.displayTitle,
      start: assignment.startsAt,
      end: assignment.endsAt,
      timezone: input.timezone,
      description: assignment.auditSummary,
    })
  }
  return calendar.toString()
}
```

### 14.4 Google Calendar 同步

- 使用 Google Calendar API + OAuth 2.0。
- 若 OAuth 未設定，必須提供 ICS download 與匯入教學。
- 每次同步需保存 export job 與 audit log。

---

## 第15節：測試策略

### 15.1 單元測試（10+ tests）

```typescript
// src/lib/calendar-projection/project-rule-to-days.test.ts
describe('calendar projection', () => {
  it('projects 2-2-3 phases into date cells', () => { /* ... */ })
  it('keeps overtime overlay separate from base shift phase', () => { /* ... */ })
})

describe('deterministic mock solver', () => {
  it('returns SolverPreview with calendarProjection and overtimeCandidates', () => { /* ... */ })
  it('blocks hard-constraint violations with explanations', () => { /* ... */ })
})
```

### 15.2 API 測試（Route Handler / curl / integration）

```typescript
// src/app/api/ai/preview-schedule/route.test.ts
describe('POST /api/ai/preview-schedule', () => {
  it('returns previewToken, proposedAssignments, calendarProjection and explanations', () => { /* ... */ })
})

describe('POST /api/ai/apply-preview', () => {
  it('creates RuleApplyRun and preserves beforeSnapshot', () => { /* ... */ })
})

describe('POST /api/export/jobs', () => {
  it('creates export job with PENDING/PROCESSING/COMPLETED lifecycle', () => { /* ... */ })
})
```

### 15.3 E2E 測試（4+ tests）

使用 Playwright：

```typescript
// tests/e2e/shiftops-calendar.spec.ts
test('calendar displays shift phase, coverage gap and optional overtime overlay', async ({ page }) => { /* ... */ })
test('AI preview can be revised and applied after human confirmation', async ({ page }) => { /* ... */ })
test('rollback restores previous assignments through RuleApplyRun', async ({ page }) => { /* ... */ })
test('export center creates PDF/ICS or printable fallback', async ({ page }) => { /* ... */ })
```

---

## 第16節：開發階段（8 phases）

### 整合施工順序 1：基礎建設（1-2 週）
- 專案初始化（Next.js 15 App Router + TypeScript + Tailwind）
- Prisma schema / migration / seed
- Route Handler scaffold 與 Zod contract
- 基礎元件庫建立（Button, Card, Modal, Calendar primitives）
- Deterministic mock solver 與 demo seed data

### 整合施工順序 2：AI-first 班表中樞（2-3 週）
- 月曆 Grid / MonthHeader / CalendarCell / DayInspector
- CalendarDayProjection 顯示：phase label、coverage gap、optional overtime overlay
- AI command panel：interpret → preview → revise → apply
- Preview diff 與 human confirmation

### 整合施工順序 3：人員、班別與資料底座（1-2 週）
- 人員 CRUD、技能/證照、可用時段
- 班別 CRUD、假日資料、需求預測 seed
- RBAC matrix 對應 UI 操作

### 整合施工順序 4：制度 seed 與 constraints 管理（2-3 週）
- NamedPatternSeed 管理：fixed、N-on-M-off、2-2-3、split、on-call、compressed week
- ShiftRuleConstraint 與 policy profile
- 不做完整傳統規則建構器；用 AI + 可管理底座取代

### 整合施工順序 5：Coverage / overtime / alert lifecycle（1-2 週）
- Coverage gap detection
- Overtime candidate engine
- Alert lifecycle：generated → acknowledged → resolved → archived
- Audit log / rollback

### 整合施工順序 6：匯出功能（1-2 週）
- PDFKit / printable HTML
- ICS 產生
- Google Calendar fallback
- Export job state machine

### 整合施工順序 7：調班與通知（1 週）
- SwapRequest CRUD
- 審核流程
- 通知中心

### 整合施工順序 8：測試與部署（1-2 週）
- Vitest / Playwright / Route Handler tests
- Prisma validate / migration / seed verification
- PWA manifest 設定
- Windows 可操作 Web 驗收入口準備

## 第17節：驗收腳本（Acceptance Scripts）

### 17.1 班表中樞驗收

```bash
# 測試月曆顯示
curl -s http://localhost:3000/api/assignments?start=2026-05-01&end=2026-05-31 | jq '.data | length' # 應 > 0

# 測試新增班次
curl -X POST http://localhost:3000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-01","staffId":"s1","shiftTypeId":"a"}' \
  | jq '.success' # 應為 true

# 測試農曆
curl -s http://localhost:3000/api/holidays/lunar/2026 | jq '.data | length' # 應 > 0
```

### 17.2 規則引擎驗收

```bash
# 測試規則預覽
curl -X POST http://localhost:3000/api/rules/preview \
  -H "Content-Type: application/json" \
  -d '{"ruleId":"r1","startDate":"2026-05-01","endDate":"2026-05-07"}' \
  | jq '.data.preview | length' # 應 > 0

# 測試規則生成
curl -X POST http://localhost:3000/api/rules/generate \
  -H "Content-Type: application/json" \
  -d '{"ruleId":"r1","startDate":"2026-05-01","endDate":"2026-05-31"}' \
  | jq '.success' # 應為 true
```

### 17.3 覆蓋報告驗收

```bash
curl -s "http://localhost:3000/api/reports/coverage?start=2026-05-01&end=2026-05-31" \
  | jq '.data.summary.warningDays' # 應顯示警告天數
```

### 17.4 匯出驗收

```bash
# PDF
curl -X POST http://localhost:3000/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{"start":"2026-05-01","end":"2026-05-31","format":"a4-landscape"}' \
  | jq '.data.url' # 應有下載連結

# ICS
curl -s http://localhost:3000/api/export/ics/2026-05-01/2026-05-31 \
  | head -c 500 # 應為 ICS 格式文字
```

---

## 第18節：給 Sebastian 的最終指令

### 18.1 開工囑託

**Sebastian，**

這是班表中樞 ShiftOps Calendar 的完整開發包。這是**全新的排班產品**，與 PromptForge 完全無關，請勿混入任何 prompt 生成相關程式碼。

### 18.2 核心優先順序

1. **先做 AI-first 月曆工作台**：月曆 cell 必須直接顯示班別 / rotation phase / coverage gap / optional overtime overlay。
2. **AI solver contract 必須先落地**：自然語言 → semantic rules / constraints → preview → human apply，不可先做漂亮 UI 再補規則。
3. **資料模型先對齊 Prisma schema**：以 `PRISMA_SCHEMA_SPEC.md` 為權威，任何 UI/API 不得使用舊簡化 model。
4. **Mock AI 必須可驗收**：無外部 key 時 deterministic mock solver 仍能覆蓋固定班、N-on-M-off、2-2-3、split、on-call、compressed week、skill coverage、overtime candidates。
5. **匯出是工作流終點**：PDF / ICS / printable fallback / Google Calendar fallback 必須能從已套用班表產生。

### 18.3 嚴禁事項

- AI 是主要操作入口：自然語言排班、查缺口、調整班表、匯出，但所有正式寫入都需人類確認。
- 不抄襲 Supershift UI（我們已有原創四圖）。
- 不做 ERP 大型模組（人力資源、財務、庫存全部不要）。
- 不摻入 PromptForge 程式碼。
- 不使用 Vite + React Router + Express/Fastify split architecture。
- 不把加班直接覆蓋到原制度班別；加班必須是 candidate/assignment overlay 並有 audit log。

### 18.4 技術偏好

- 使用 Next.js 15 App Router + TypeScript + Tailwind + Prisma + PostgreSQL。
- 後端 API 使用 Next.js Route Handlers。
- 農曆使用 seed data 或封裝套件，但需可在本機 deterministic 驗收。
- PDF 使用 PDFKit 或 server-side HTML printable fallback；不要把 `jsPDF + html2canvas` 當唯一方案。
- ICS 使用 `ical-generator` 或等價 server-side writer。
- 測試使用 Vitest + Playwright；Prisma 需跑 `prisma validate` / migration / seed。

### 18.5 提交頻率

每個整合施工順序完成後提交 PR，附上：
- 功能截圖或 Playwright trace。
- Route Handler / curl / API 測試證據。
- Prisma migration / seed / schema validate 證據。
- 任何已知問題。

### 18.6 溝通方式

發現任何規格不清、需求衝突、或預估時間超支，立即回報，不要等到週報。

## 第19節：依賴套件清單

```json
{
  "dependencies": {
    "@prisma/client": "latest",
    "@tanstack/react-query": "latest",
    "clsx": "latest",
    "date-fns": "latest",
    "ical-generator": "latest",
    "next": "^15.0.0",
    "pdfkit": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-hook-form": "latest",
    "recharts": "latest",
    "tailwind-merge": "latest",
    "zod": "latest",
    "zustand": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@types/node": "latest",
    "@types/pdfkit": "latest",
    "prisma": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

若 Next.js starter 產生的 React 版本與上方不同，以 Next.js 15 官方 peer dependency 為準，但不得改回 Vite / React Router / Express split architecture。

## 第20節：環境變數

```bash
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/shiftops"
JWT_SECRET="your-super-secret-jwt-key"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
```

---

## 第21節：效能目標

- 月曆渲染 < 100ms（100 人團隊、31 天）
- API 回應 < 200ms（一般查詢）、< 1s（規則生成覆蓋 31 天）
- PDF 匯出 < 5s
- Lighthouse Performance Score > 85

---

## 第22節：PWA 設定

```json
// public/manifest.json
{
  "name": "班表中樞 ShiftOps Calendar",
  "short_name": "ShiftOps",
  "start_url": "/calendar",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Service Worker：快取靜態資源、離線顯示最後已知班表。

---

## 第23節：安全考量

1. **認證：** JWT access token（15min）+ refresh token（7 days）
2. **授權：** RBAC（manager 可審核調班、編輯規則；member 只能檢視與申請）
3. **輸入驗證：** 所有 API input 經 Zod schema 驗證
4. **SQL injection：** Prisma ORM 防護
5. **XSS：** React 預設防護 + CSP header

---

## 第24節：完整交付邊界與不納入項目

本開發案是一次性完整規劃開發。以下內容是本案刻意不納入的產品邊界，用來避免排班工具膨脹成大型 ERP 或 AI 平台：

- 原生 iOS / Android App：本案交付 Web / PWA。
- 薪資結算、打卡硬體、庫存、人資全模組：本案只做排班閉環。
- 黑箱全自動排班：本案做 AI 編排、預演、解釋、建議與人類確認，不做無審核直接覆蓋正式班表。
- 多公司集團治理、跨國法規套件：本案保留單組織 / 單工作區 / 多地點基礎，不做集團治理。

不納入項目不得寫成開發人員可選做；正式驗收只看第0節、第3節、第4–18節與驗收文件列出的完整閉環是否完成。

---

## 第25節：風險註記

| 風險 | 嚴重度 | 緩解 |
|------|--------|------|
| 農曆資料不完整 | 中 | 預先 seed 2026-2027 完整資料 |
| Google Calendar OAuth 複雜 | 中 | 先行 ICS 匯出，OAuth 後補 |
| AI 編排結果不可控 | 高 | AI 只產生 preview；所有寫入需人類確認；每個 action 必須有 reason、audit log、rollback |
| PDF 跨瀏覽器相容性 | 中 | 使用 PDFKit 或 server-side printable HTML fallback，不以瀏覽器截圖作為唯一 PDF 方案 |

---

## 第26節：檔案交付清單

```text
交付物/
├── proposal_full.md
├── SPEC.md
├── FULL_BUILD_CHECKLIST.md
├── ACCEPTANCE.md
├── RISKS.md
├── SEBASTIAN_START_PROMPT.md
├── AI_SOLVER_SPEC.md
├── CALENDAR_PROJECTION_ALGORITHM.md
├── PRISMA_SCHEMA_SPEC.md
├── MOCK_AI_BEHAVIOR_SPEC.md
├── OVERTIME_FLOW_SPEC.md
├── RBAC_MATRIX.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── calendar/page.tsx
│   │   ├── ai/previews/[id]/page.tsx
│   │   └── api/*/route.ts
│   ├── components/
│   ├── lib/
│   │   ├── solver/
│   │   ├── calendar-projection/
│   │   ├── coverage/
│   │   ├── overtime/
│   │   └── export/
│   └── types/
└── tests/
    ├── unit/
    └── e2e/
```

不得交付 `client/` + `server/` split 專案作為本案正式實作。

**狀態：proposal_full.md 已於 2026-04-28T12:56:50+08:00 清除 Vite/Express 舊架構衝突，統一為 Next.js 15 + Route Handlers + Prisma/PostgreSQL；仍等待 Jason 確認後才送 plan.ready。**