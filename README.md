# ShiftOps Calendar

AI-First 智慧排班系統 — 基於 Next.js 14 + Prisma + Mock AI 的班表中樞。

## 功能

- **月曆頁** (`/calendar`)：月視圖、calendar cell、班別投影、缺口 badge、加班 overlay 開關、Day Inspector、AI Panel、Settings stub
- **AI 排班 API**：
  - `POST /api/ai/preview-schedule` — 輸入自然語言排班需求，取得 AI 排班預演
  - `GET /api/ai/previews/[token]` — 查詢特定 preview 狀態與 projection
  - `POST /api/ai/apply-preview` — 套用排班預演到正式資料庫
  - `POST /api/ai/apply-runs/[id]/rollback` — 復原指定 apply run
- **調班 Workflow API**（ACCEPTANCE Script D）：
  - `POST /api/swap-requests` — member 提出調班申請（附 AI 替代建議）
  - `GET /api/swap-requests` — 查詢調班申請列表
  - `PATCH /api/swap-requests/[id]/approve` — manager 核准/駁回調班
- **多制度並行 API**（ACCEPTANCE Script G/H）：
  - `POST /api/schedule/multi-policy` — 同組織多套制度並行不覆寫
- **匯出 Job API**：
  - `POST /api/export/jobs` — 建立 PDF/PNG/ICS/CSV 匯出任務
  - `GET /api/export/jobs/[jobId]` — 查詢匯出任務狀態
- **PWA / Offline**（ACCEPTANCE Script F）：
  - `GET /api/calendar/google-fallback` — Google Calendar 未設定時的本地 fallback
  - `GET /api/calendar/ics` — ICS 格式班表下載
  - `GET /api/calendar/last-known` — 離線時最後已知班表快取
  - Service Worker (`/sw.js`) + Web App Manifest (`/manifest.json`)
- **Mock AI**：無外部 API Key 時 deterministic 回傳完整 structured payload（做三休一、A/B 輪替、2-2-3、加班候選等）

## 核心規格文件

| 文件 | 用途 |
|------|------|
| `AI_SOLVER_SPEC.md` | AI solver 行為合約與 structured output 規格 |
| `AI_FIRST_STRATEGY.md` | AI-first 產品策略與對話式排班設計 |
| `AI_ENGINE_SPEC.md` | AI engine 整合架構（mock/real 切換） |
| `CALENDAR_PROJECTION_ALGORITHM.md` | 月曆 projection 演算法與狀態機 |
| `CALENDAR_SHIFT_DISPLAY_MODEL.md` | 班別呈現模型與 CalendarCellDisplaySetting |
| `OVERTIME_FLOW_SPEC.md` | 加班候選 → 核准 → 呈現流程 |
| `RBAC_MATRIX.md` | 角色權限矩陣（ADMIN/MANAGER/MEMBER） |
| `PRISMA_SCHEMA_SPEC.md` | Prisma Schema 完整模型規格 |
| `MOCK_AI_BEHAVIOR_SPEC.md` | Mock AI deterministic 行為規格 |
| `SHIFT_PATTERNS_SEMANTIC_LIBRARY.md` | 命名制度語意庫（2-2-3、DuPont、Pitman、4-4 等） |
| `SPEC.md` | 完整產品規格書 |

## 快速開始

### 環境

- Node.js ≥ 18
- **不支援 `npm`**；使用 `node --run <script>` 執行所有腳本

### 安裝依賴（已附 node_modules）

```bash
# 如需重新安裝
npm install --ignore-scripts
```

### 初始化資料庫

```bash
node --run db:generate
node --run db:push
node --run db:seed
```

### 開發

```bash
node --run dev
# 開啟 http://localhost:3000
```

### 建置

```bash
node --run build
```

### 測試

```bash
node --run test          # 所有測試
node --run test:unit     # 單元測試
node --run test:api      # API 路由測試
node --run test:e2e     # E2E 整合測試（含內建 server bootstrap）
```

## 驗收入口（Windows / Web）

### Web 驗證

1. **建置後生產環境**：
   ```bash
   node --run build && node --run start
   # 開啟 http://localhost:3000
   ```
2. **Login（ACCEPTANCE Script A/D）**：
   - manager@shiftops.local / manager2026（MANAGER 角色）
   - admin@supershift.com / admin2026（ADMIN 角色）
   - member@test.com / test1234（MEMBER 角色）
3. **月曆驗證**：
   - `/calendar` 顯示 2026 年 5 月月曆，含制度投影、缺口徽章
   - 點擊日期 → Day Inspector（含加班候選）
   - 切換加班 overlay：隱藏 / 徽章 / 候選人 / 已確認

### Windows 驗證（直接開啟）

- `D:\WORK\成品區\ShiftOps Calendar\` 或映射網路磁碟
- `node --run build` → `node --run start` → 瀏覽器開 http://localhost:3000

### API 驗證（curl）

```bash
# 1. Login
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@shiftops.local","password":"manager2026"}' \
  | jq -r '.data.token' > /tmp/token.txt

# 2. AI preview（Mock mode）
curl -s -X POST http://localhost:3000/api/ai/preview-schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -d '{"organizationId":"org_demo","locationId":"loc_demo","dateRange":{"start":"2026-05-01","end":"2026-05-31"},"prompt":"做三休一排五月A/B班"}' \
  | jq '.data.previewToken'

# 3. Apply preview
curl -s -X POST http://localhost:3000/api/ai/apply-preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -d '{"previewToken":"<token>","organizationId":"org_demo","locationId":"loc_demo"}' \
  | jq '.data.applyRunId'

# 4. Swap request — member 提出調班
curl -s -X POST http://localhost:3000/api/swap-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -d '{"organizationId":"org_demo","requesterId":"staff_1","requesterName":"王小明","targetDate":"2026-05-06","targetShiftTypeId":"st_morning"}' \
  | jq '.data.status'

# 5. Manager 核准調班
curl -s -X PATCH http://localhost:3000/api/swap-requests/<swapId>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -d '{"status":"approved","comment":"OK"}' \
  | jq '.data.status'

# 6. Google Calendar fallback（無 API Key）
curl -s http://localhost:3000/api/calendar/google-fallback?locationId=loc_demo \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  | jq '.data.source'

# 7. ICS 下載
curl -s -o /tmp/schedule.ics "http://localhost:3000/api/calendar/ics?locationId=loc_demo&start=2026-05-01&end=2026-05-31"
head -5 /tmp/schedule.ics

# 8. 多制度並行
curl -s -X POST http://localhost:3000/api/schedule/multi-policy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -d '{"organizationId":"org_demo","locationId":"loc_demo","dateRange":{"start":"2026-05-01","end":"2026-05-03"},"policies":[{"name":"A組-2-2-3","patternType":"2-2-3","scopeStaffIds":["staff_1","staff_2"]},{"name":"B組-固定早班","patternType":"fixed_shift","scopeStaffIds":["staff_3"]}]}' \
  | jq '.data.policies'

# 9. Export job（需 organizationId + locationId + type）
curl -s -X POST http://localhost:3000/api/export/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -d '{"organizationId":"org_demo","locationId":"loc_demo","type":"ICS"}' \
  | jq '.data.jobId'

# 10. Query export job status
curl -s http://localhost:3000/api/export/jobs/<jobId> \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  | jq '.data.status'

# 11. Rollback apply run（需 applyRunId + organizationId）
curl -s -X POST http://localhost:3000/api/ai/apply-runs/<applyRunId>/rollback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -d '{"applyRunId":"<applyRunId>","organizationId":"org_demo"}' \
  | jq '.data.success'
```

## 專案結構

```
app/
  layout.tsx              # Root layout + PWA service worker registration
  page.tsx                # Landing page
  calendar/
    page.tsx              # 月曆主控台頁面
  api/
    ai/
      preview-schedule/route.ts    # POST AI 排班預演
      previews/[token]/route.ts   # GET 查詢 preview
      apply-preview/route.ts       # POST 套用 preview
      apply-runs/[id]/rollback/route.ts  # POST rollback
    swap-requests/
      route.ts                      # POST/GET swap requests
      [id]/approve/route.ts        # PATCH manager approve/reject
    schedule/
      multi-policy/route.ts        # POST multi-policy parallel scheduling
    calendar/
      google-fallback/route.ts     # GET Google Calendar fallback
      ics/route.ts                 # GET ICS download
      last-known/route.ts          # GET/POST last known schedule
    export/
      jobs/route.ts       # POST 建立匯出 job
      jobs/[jobId]/route.ts  # GET 查詢 job 狀態
    auth/
      login/route.ts      # POST login
      logout/route.ts     # POST logout
      me/route.ts         # GET current user
    staff/                # Staff CRUD
    shift-types/          # ShiftType CRUD
prisma/
  schema.prisma           # Prisma schema（ShiftOps models + SwapRequest）
  seed.ts                 # Mock seed data
public/
  manifest.json           # PWA Web App Manifest
  sw.js                   # Service Worker（offline caching + last-known）
lib/
  prisma.ts               # Prisma client singleton
  auth.ts                 # JWT auth + login/logout helpers
  mock-ai.ts              # Mock AI adapter（deterministic）
  rbac.ts                 # Role-based access control
tests/
  api/
    auth.test.ts          # Auth API tests
    routes.test.ts        # Core API route tests
    swap-requests.test.ts # SwapRequest workflow tests
    calendar-pwa.test.ts  # PWA/Google-fallback/multi-policy tests
  e2e/
    scenarios.test.ts     # E2E scenarios (HTTP-driven)
  unit/
    core.test.ts          # Unit tests
```

## 環境變數

```
DATABASE_URL="file:./dev.db"
MOCK_AI="true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# GOOGLE_CALENDAR_ID=     # 可選，未設定則使用本地 fallback
# GOOGLE_SERVICE_ACCOUNT_KEY=  # 可選
```

## API 通用格式

成功：`{ "data": ..., "meta": { "requestId": "..." } }`
錯誤：`{ "error": { "code": "...", "message": "..." } }`

## Mock AI 支援語句

| Prompt | Mock 行為 |
|--------|-----------|
| 做三休一 | n_on_m_off phases: work=3/off=1 |
| 做四休四 | n_on_m_off phases: work=4/off=4 |
| A/B 輪替 | A/B shift sequence |
| 2-2-3 | named_pattern seed |
| 待命 | on_call shift window |
| 加班 | overtimeCandidates 列表 |
| 匯出 PDF | export job draft |
