# EXECUTION_READINESS_REVIEW_20260428.md — ShiftOps Calendar 補件後結構可執行性評估

updated_at: 2026-04-28T14:42:47+08:00
status: executable_structure_review
reviewer: Sophie

## 0. 一句話結論
補件後，本案已從「概念正確但不可開工」提升為「結構上可開發、可整合執行、可驗收」，但仍不建議在 Jason 未確認前自動 plan.ready。若 Jason 確認方向，下一步可以進入 Sebastian handoff；若要更穩，開工前只需再做一次最终開發包凍結與檔案清單校驗。

## 1. 可執行性總評

| 維度 | 評分 | 判斷 |
|---|---:|---|
| 技術棧一致性 | 8.5/10 | 已統一 Next.js 15 + Route Handlers + Prisma/PostgreSQL；proposal_full 仍保留少量「不得使用 Vite/Express」字樣，但已是禁止語境，不再是衝突。 |
| 資料模型可落地性 | 8/10 | PRISMA_SCHEMA_SPEC 已補 23 個 model / 6 個 enum，覆蓋排班、投影、加班、權限、export、audit 核心。仍可在實作時補 relation 細節與 indexes。 |
| AI / Solver 可執行性 | 7.5/10 | AI_SOLVER_SPEC 已把 AI 與 deterministic solver 切開，可實作 mock + heuristic solver。全域最佳化不是必要首交付，但需避免開發者誤解成需要 OR-Tools 等重型排程最佳化。 |
| 月曆投影可執行性 | 8/10 | 已有 cycle day / phase / multi-rule overlay / compact-lane-inspector 分層。足夠做首版可驗收 projection。 |
| 加班候選流程 | 8.5/10 | 責任分工清楚：Coverage → Candidate → AI explanation/rank → Manager confirm → overtime assignment → projection recompute。 |
| RBAC / 審計安全 | 8/10 | RBAC_MATRIX 已足夠開發；rollback/applyRun/audit 有方向。實作時需補 middleware 與測試。 |
| 驗收可控性 | 8.5/10 | Acceptance 已有 Script A–M，含 API curl、mock mode、權限、rollback、export job。可驗收性明顯提升。 |
| Scope 管控 | 7/10 | 功能仍大，但目前被切成 deterministic modules。風險在 Sebastian 若一次全做所有制度最佳化會膨脹；需在 start prompt 強調先完成 deterministic seed coverage，再擴展 solver。 |

整體可執行性：**8/10，可進入開工前凍結檢查；未經 Jason 確認仍不送 plan.ready。**

---

## 2. 補件後架構是否能被 Sebastian 一次性整合執行？
可以，但不得拆工。以下是單一 repo / 單一開發責任下的內部依賴順序，不是分工、不是分批交付、不是分段驗收：

1. **Project / Auth / RBAC foundation**
   - Next.js 15、Prisma、JWT/session、admin/manager/member middleware。
   - 驗收：RBAC_MATRIX 的 member/manager/admin 基本權限。

2. **Prisma schema / seed / demo data**
   - 依 PRISMA_SCHEMA_SPEC 建 migration。
   - seed staff、shiftTypes、skills、availability、coverage、namedPatternSeeds、2026-2027 holiday/lunar。
   - 驗收：demo seed 一鍵建立。

3. **Calendar projection engine**
   - 實作 cycleDay、phaseLabel、ruleProjection、compact/lane/inspector output。
   - 驗收：2-2-3、做四休四、固定班、on-call 可投影到日期格。

4. **Coverage / alert lifecycle**
   - required vs actual、skill coverage、rest/hour warnings。
   - generated → acknowledged → resolved → archived。
   - 驗收：補人/加班後 alert resolved。

5. **Deterministic solver + mock AI adapter**
   - AI interpret mock phrases → constraints。
   - SolverPreview output：assignments、calendarProjection、alerts、overtimeCandidates。
   - 驗收：無 AI key 也跑 Script A/G/H/K/M。

6. **Overtime candidate / assignment overlay**
   - Candidate engine、AI explanation、manager confirm、OT overlay display modes。
   - 驗收：Script J。

7. **Schedule apply / rollback / audit**
   - Preview → applyRun → beforeSnapshot → assignment write → audit → rollback。
   - 驗收：Script L/M。

8. **UI shell / Calendar / Day Inspector / AI panel**
   - Calendar cell layers、right inspector、AI assistant panel、inline edit。
   - 驗收：Script I + core UX。

9. **Export / PWA / reports / README / tests**
   - Async export job、PDF/PNG/ICS、offline last-known schedule、README。
   - 驗收：Script E/F/M。

這個拆法是「施工批次」，不是 MVP/V1/V2 分段；每批都服務於一次性完整交付。

---

## 3. 目前已解掉的原 P0

### P0-1 技術棧衝突
狀態：**基本已解**。
- SPEC 明確 Next.js 15 Route Handlers。
- proposal_full 已有權威技術棧聲明與禁止舊架構段落。
- 搜尋仍可看到 Vite / Express / React 18，但語境多為「不得使用」或「舊段落失效」，不是開工依據。

### P0-2 AI Solver 未定義
狀態：**已解到可開發程度**。
- AI_SOLVER_SPEC 有 input、hard/soft constraints、pipeline、scoring、blocked response、preview output。
- 建議 Sebastian 實作 heuristic deterministic solver，不要一開始追求完整最佳化。

### P0-3 Calendar Projection 缺口
狀態：**已解到可開發程度**。
- CALENDAR_PROJECTION_ALGORITHM 已定義 cycleDay、phase label、多制度疊加、compact/lane/inspector。

### P0-4 Schema 不完整
狀態：**已解到規格層可開發**。
- PRISMA_SCHEMA_SPEC 有 23 models / 6 enums。
- 仍需 Sebastian 在真 schema.prisma 補 Prisma relation backrefs、indexes、cascade rules。

### P0-5 Mock AI scope 不清
狀態：**已解**。
- MOCK_AI_BEHAVIOR_SPEC 明確支援語句、payload、seed dependency、紅線。

---

## 4. 剩餘可執行風險

### R1：Solver 可能被誤解成「全域最佳排班系統」
風險：如果 Sebastian 追求完整最佳化，scope 會爆。
控法：start prompt 要明寫：首交付做 deterministic heuristic solver + mock coverage，不要求數學最佳解。

### R2：Prisma schema 是 spec，不是真 migration
風險：PRISMA_SCHEMA_SPEC 可指導，但仍不是可直接 `prisma validate` 的最終 schema。
控法：Sebastian 第一批次必須把它轉成 `prisma/schema.prisma` 並跑 validate/migration。

### R3：UI 功能密度高
風險：Calendar cell 要顯示 expected shift、assigned staff、gap、OT overlay，多制度同日會擠。
控法：嚴格採 compact cell + lane mode + inspector detail，不得把全部資訊塞進 cell。

### R4：proposal_full 還是很長，開發者可能讀漏補件
風險：雖然已補權威聲明，但正式開工應以 SEBASTIAN_START_PROMPT 的必讀清單為入口。
控法：handoff 時把補件列成「不得跳過」；README 第一段列權威文件順序。

### R5：Billing placeholder 還是低價值模組
風險：可能浪費時間。
控法：保持 static plan limits demo，不接金流，不做 Stripe。

---

## 5. 是否能 plan.ready？

### 技術/結構角度
**可以接近 plan.ready。** 目前結構已能讓 Sebastian 開工，不再是空泛產品文件。

### 流程/使用者 gate 角度
**仍不可自動 plan.ready。** 最新 handoff 明確是等待 Jason 確認；未確認前不得交 Sebastian。

### 建議判定
- 若 Jason 回覆「可以交開發」：可進行 final freeze → plan.ready。
- 若 Jason 要再看問題：維持 planning correction。
- 若 Jason 要更精簡：優先砍 billing / reports detail / advanced demand forecast，保留 solver/projection/overtime/RBAC/audit/export。

---

## 6. 最終建議
現在不要再補大功能。下一步只做二選一：

1. **Jason 確認可交開發**：做 final freeze，產生 Sebastian handoff package，送 plan.ready。
2. **Jason 還要再修**：只修 execution details，不再擴產品 scope。

本案目前最重要的產品骨架已成立：
- AI-first 但不讓 AI 直接寫正式班表。
- 多排班制度轉 constraints。
- 規則投影到月曆 cell。
- 加班是 optional overlay。
- Solver / projection / overtime / RBAC / schema / mock / acceptance 都已有可開發合約。


---

## 7. Jason 2026-04-28 校正：不得拆工
本案後續不得再用「拆工」或「分批交付」語氣描述。上述順序只代表同一開發主線內的依賴順序。

正式 handoff 給 Sebastian 時必須明確寫：
- 單一 repo。
- 單一資料模型權威。
- 單一 API contract。
- 單一整合驗收。
- 一次性完整交付。

不得拆成 UI / AI / solver / schema / export 多個獨立任務，否則後續整合問題會放大。
