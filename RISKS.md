# RISKS.md — 風險與回退策略

1. AI 編排不可控：AI 只產生 preview；所有寫入需人類確認；每個 action 必須有 reason、audit log、rollback。
2. AI API Key 不可用：內建 deterministic mock AI，核心驗收不依賴外部服務。
3. 規則解析錯誤：所有 AI output 經 Zod schema 驗證，不合格則要求澄清。
4. Google Calendar OAuth 複雜：必做 ICS fallback，不阻塞匯出驗收。
5. PDF 跨瀏覽器差異：以 server-side printable HTML + PDF library，失敗時保留 HTML print page。
6. 農曆節氣資料：正式交付 seed 2026–2027，避免依賴外部 API。
7. Scope 膨脹成 ERP：不做薪資、打卡、庫存、HR 全模組；只做 AI-first 排班閉環。
8. UI 複製疑慮：正式採用原創 Web-native sidebar/inspector/AI panel 佈局。

9. 技術棧衝突：以 `SPEC.md` / `PRISMA_SCHEMA_SPEC.md` 的 Next.js 15 + Prisma 為權威，清除 Vite/Express 假設。
10. Solver 不可驗收：以 `AI_SOLVER_SPEC.md` 定義 deterministic solver；AI 只 interpret/explain/sort。
11. 月曆投影錯誤：以 `CALENDAR_PROJECTION_ALGORITHM.md` 定義 cycle day / phase / multi-rule overlay。
12. 加班候選不可信：以 `OVERTIME_FLOW_SPEC.md` 規定候選由 deterministic engine 產生，AI 不可憑空生成。
13. 權限誤開：以 `RBAC_MATRIX.md` 驗證每個 AI/action 權限。
14. Schema 漂移：以 `PRISMA_SCHEMA_SPEC.md` 作資料模型權威，不得另建衝突 SQL。


## 2026-04-28T12:56:50+08:00 P0 proposal rewrite status

- 技術棧衝突已處理：`proposal_full.md` 第4/5/8/9/10/11/18/19/26節已清除 Vite / React Router / Express split architecture，改以 Next.js 15 App Router + Route Handlers + Prisma/PostgreSQL 為權威。
- 剩餘風險：仍需 Jason 明確確認 AI-first 完整方案與 mockup direction 後，才可 `plan.ready`。
