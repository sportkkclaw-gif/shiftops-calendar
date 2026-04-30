# REPLAN_RISK_REVIEW_20260428.md — ShiftOps Calendar 重新檢視問題清單

updated_at: 2026-04-28T12:34:19+08:00
status: p0_review_resolved_user_gate_pending
reviewer: Sophie + independent subagent review

## 結論
目前這版方向是對的：AI-first、多制度 constraint、月曆投影、加班 optional overlay 都是產品核心。但它尚未適合送 Sebastian 開工，因為「產品原則」已補強，實作合約仍有多個 P0 缺口。

若現在直接交開發，最大風險不是做不出 UI，而是後端資料模型、AI solver、月曆投影、加班候選流程彼此無法對齊，導致做出一個看似漂亮但規則不可驗收的排班 demo。

---

## P0 — 未修不可 plan.ready

### P0-1 技術棧衝突
- `SPEC.md` 指 Next.js 15 App Router。
- `proposal_full.md` 仍含 React 18 + Vite / Express.js 相關舊架構。
- 風險：Sebastian 開工時會不知道以哪份為準，路由/API/SSR/部署模式全衝突。
- 修正：統一以 Next.js 15 App Router + Route Handlers + PostgreSQL/Prisma 為準，清掉 proposal_full 內 Vite/Express 假設。

### P0-2 AI Solver 未定義
- 已定義 semantic rules / constraints，但沒有 solver 演算法規格。
- 缺：輸入、求解流程、hard/soft constraints、分數、失敗回傳、解釋格式。
- 修正：新增 `AI_SOLVER_SPEC.md`。

### P0-3 月曆投影演算法缺口
- 已要求 CalendarDayProjection，但沒定義如何從 rule 算出 date cell phase。
- 缺：anchor date、cycle day、phase label、多制度疊加、group/lane 顯示優先序。
- 修正：新增/補 `CALENDAR_PROJECTION_ALGORITHM.md` 或併入 Calendar spec。

### P0-4 Prisma schema 不完整
- SPEC 列出 30+ 表，但 proposal_full 的 TypeScript/SQL 舊模型只覆蓋部分。
- 特別缺：`calendar_day_projections`、`overtime_candidates`、`overtime_assignments`、`shift_rule_constraints`、`schedule_policy_profiles`、`staff_availability_windows`、`staff_skill_certifications`、`demand_forecasts`、`named_pattern_seeds`。
- 修正：補完整 Prisma schema，並移除舊模型衝突。

### P0-5 Mock AI scope 不清
- Mock AI 被要求支援很多制度，但沒有明確 mock payload 與可驗收範圍。
- 風險：開發者可能只 hard-code 做三休一，也可能過度寫一套假 solver。
- 修正：定義 Mock AI deterministic interpreter scope：固定班、N-on-M-off、2-2-3、split shift、on-call、compressed week、skill coverage、overtime candidates。

---

## P1 — 會造成體驗混亂或返工

### P1-1 多制度並行的 UI 顯示規則不足
- A 組 2-2-3、B 組固定早班、C 組 on-call 同一天如何顯示？
- 月曆 cell 不能無限制塞滿 badge。
- 修正：定義 cell compact mode / lane mode / inspector detail mode。

### P1-2 加班候選流程責任不清
- 候選由 Coverage Engine 算、AI 排序，還是 AI 直接產生？
- 修正：建議 deterministic engine 先產候選，AI 只解釋/排序，不直接憑空創造候選。

### P1-3 AI-first 取代傳統功能後，底層 UI 邊界不清
- 說規則建構器被 AI 取代，但資料底座仍需可管理 rule seed / policy / availability。
- 修正：明確區分「不用完整規則建構器」與「仍需 settings/data 管理底座」。

### P1-4 Billing placeholder 空殼
- `/billing`、plan_limits 存在，但缺 API、schema、驗收。
- 修正：若只是 placeholder，明確降級為靜態 plan limits demo；否則補完整 billing spec。

### P1-5 RBAC matrix 不足
- manager/member/admin 權限太粗。
- 缺：AI interpret / preview / apply / rollback / overtime approve / export / audit read 的角色矩陣。
- 修正：補 RBAC_MATRIX.md。

### P1-6 Coverage alert lifecycle 未定義
- 缺口何時產生、清除、歸檔、被 overtime 解決後如何更新未定義。
- 修正：補 alert lifecycle：generated → acknowledged → resolved → archived。

---

## P2 — 驗收細節風險

### P2-1 Rollback 顆粒度不足
- rollback 是 preview apply 前 snapshot？整月？單日？單筆 assignment？
- 修正：定義 atomic apply run + before_snapshot + conflict check。

### P2-2 Export async job 不完整
- 缺 pending/processing/completed/failed 狀態、下載 URL、重試、過期。
- 修正：補 export job state machine。

### P2-3 Weekend / holiday / coverage 語意需精準
- 「週末至少兩人」是每日兩人，不是週末總共兩人，需寫明。
- 修正：補 natural language ambiguity defaults。

### P2-4 Split shift 資料模型未選定
- 一天兩段班是兩筆 assignment，還是一筆 assignment + segments？
- 修正：建議 `shift_assignments` + `shift_assignment_segments`。

### P2-5 SEBASTIAN_START_PROMPT 未納入最新必讀文件
- 目前必讀沒有列 `SHIFT_PATTERNS_SEMANTIC_LIBRARY.md`、`CALENDAR_SHIFT_DISPLAY_MODEL.md`。
- 修正：補進 Sebastian prompt，否則開發會漏掉最新校正。

---

## 建議修正順序
1. 統一技術棧與資料模型權威來源。
2. 補 AI solver spec。
3. 補 Calendar projection algorithm。
4. 補 Prisma schema / TypeScript model。
5. 補 Overtime candidate flow。
6. 補 RBAC matrix / alert lifecycle / rollback / export state。
7. 更新 ACCEPTANCE、FULL_BUILD_CHECKLIST、SEBASTIAN_START_PROMPT。

## 是否可送 Sebastian？
不建議。現在仍應維持 `waiting_user_mockup_approval` / planning correction。至少 P0-1 到 P0-5 補完後，才可進入 plan.ready 判定。


## 2026-04-28T14:38:25+08:00 P0 resolution follow-up
- P0-1 技術棧衝突：已由 `proposal_full.md` 12:56:50 patch 統一為 Next.js 15 App Router + Route Handlers + Prisma/PostgreSQL，並明確排除 Vite/Express split architecture。
- P0-2 AI Solver 未定義：已由 `AI_SOLVER_SPEC.md` 補齊 deterministic solver contract、constraints、scoring、blocked response 與 mock scope。
- P0-3 月曆投影演算法缺口：已由 `CALENDAR_PROJECTION_ALGORITHM.md` 補齊 date cell projection、phase/cycle 計算與例外處理。
- P0-4 Prisma schema 不完整：已由 `PRISMA_SCHEMA_SPEC.md` 補齊 calendar projections、overtime、constraints、policy、availability、skills、demand forecast、pattern seeds 等表。
- P0-5 Mock AI scope 不清：已由 `MOCK_AI_BEHAVIOR_SPEC.md` 補齊無 API Key 驗收 payload 與 deterministic mock 範圍。
- 判定：P0 planning gaps 已清；仍維持 Jason approval gate，未核准前不得 plan.ready。
