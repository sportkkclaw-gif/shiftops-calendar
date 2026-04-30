# ACCEPTANCE.md — 完整驗收標準

## 硬性通過標準
1. manager demo 帳號可登入。
2. 2026 年 5 月月曆可顯示班表。
3. A班 / B班 / 休假 / 節日 / 農曆可見。
3a. 月曆每個日期 cell 可直接顯示制度應排班別，不需打開 AI 才知道今天是哪個班。
3b. 月曆可切換加班 overlay：隱藏 / 徽章 / 候選人 / 已確認加班。
4. AI Assistant Panel 可開啟。
5. 輸入「做三休一，排 2026 年 5 月 A/B 班」會產生 preview。
6. preview 不會直接寫入正式班表。
6a. AI 不得只支援固定週期；必須支援彈性 constraint 語意。
6b. 命名制度只能作可編輯 seed，不得 hard-code 單一公式。
7. manager 確認 preview 後，月曆正式更新。
8. 可用自然語言 revise preview，例如「週末多補一人」。
9. 點日期可開 Day Inspector。
10. Day Inspector 可顯示 AI 警告解釋。
11. 可 inline 新增/編輯/刪除單筆班次。
12. 可新增人員。
13. 可新增班別。
14. 覆蓋不足會在月曆與 AI 回答中標記。
15. 超時或連班風險會產生 warning。
16. member 可提出調班申請。
17. AI 可建議替代人員，但不能自動核准。
18. manager 可核准調班。
19. AI 可回答 coverage / hours 問題並附圖表或表格。
20. Export center 可產 PDF / PNG / ICS。
21. AI 可用自然語言觸發匯出。
22. Google Calendar 未設定時有 fallback。
23. PWA 可安裝。
24. 離線時可顯示最後已知班表。
25. Demo seed 一鍵建立。
26. 無 AI Key 時 mock AI 仍可通過核心腳本。
27. README 完整。
28. Unit / API / E2E 測試通過。
29. 可同時支援固定班、輪班、2-2-3、做四休四、split shift、on-call、compressed week、技能覆蓋。
30. 同一組織內多套制度可並行且互不覆寫。
31. 缺班日期可在 Day Inspector 顯示可加班候選選項。
32. 加班 assignment 不覆蓋原制度班別，且可選擇是否在月曆與匯出中呈現。

## 驗收操作腳本
### Script A：AI 排班預演與套用
登入 manager@shiftops.local → /calendar → 開 AI Assistant → 輸入「做三休一，排 2026 年 5 月 A/B 班，避開國定假日」→ 預期出現 preview、warnings、reason → 點確認 → 月曆更新。

### Script B：AI 修正預演
在 preview 狀態輸入「週末 B班至少 2 人」→ 預期 preview 更新並顯示差異。

### Script C：AI 查缺口
輸入「本月缺口在哪些天？」→ 預期月曆標記缺班日期，AI 列出前三個缺口與原因。

### Script D：AI 協助調班
member 提出 5/6 與 5/9 調班 → AI 建議替代人員與風險 → manager 核准 → /calendar 兩日班次更新且 audit_events 留紀錄。

### Script E：AI 匯出
輸入「匯出 2026 年 5 月 PDF，包含人員、時間、備註」→ 建立 export job → 可下載 PDF；再匯出 ICS → export history 出現紀錄。

### Script F：離線與 Mock AI
清空 AI API Key → 啟用 mock mode → 執行 Script A/C/E → 預期完整通過；開 /calendar → 關網路 → refresh → 顯示 last-known schedule 與離線提示。


### Script G：多制度並行與彈性 constraint
登入 manager@shiftops.local → /calendar → AI Assistant 輸入「A組用2-2-3，B組固定早班，C組週末待命到22:00；週末至少兩人，其中一人必須是店長」→ 預期 preview 顯示三套制度、skill coverage、on-call 標記、constraint priority 與 conflict explanation。

### Script H：非固定週期與多段班
輸入「做四休四排三個月；小王每週一到週四四天十小時；小林週五做9-13、17-21兩段班」→ 預期系統正確處理非整週循環、compressed week、split shift，並顯示工時/休息間隔警告。


### Script I：輪班制度與月曆呈現掛勾
登入 manager@shiftops.local → /calendar → 檢查今日 cell → 預期不開 AI 也能看到制度應排班別（例如 A/B/休/待命）、實際已排人員、缺口徽章。點擊日期 → Day Inspector 顯示該日 rule projection、cycle day、phase label。

### Script J：加班可選顯示與填補
在一個 B班缺1人的日期點開 Day Inspector → 預期顯示可加班候選選項與理由。切換月曆右上「顯示加班」為隱藏/徽章/候選人/已確認 → 預期 cell 呈現同步改變，但原 A/B/休等正式班別不消失。確認一位候選人加班 → 產生 overtime assignment 與 audit log，且 PDF 匯出可選是否包含加班。

### Script K：P0 補件驗證
檢查文件與開發實作：AI_SOLVER_SPEC / CALENDAR_PROJECTION_ALGORITHM / OVERTIME_FLOW_SPEC / RBAC_MATRIX / PRISMA_SCHEMA_SPEC / MOCK_AI_BEHAVIOR_SPEC 均存在且 README 有引用。執行 mock mode：做四休四、2-2-3、多段班、on-call、週末店長覆蓋、加班候選皆回 structured payload。

### Script L：權限與非同步流程
member 嘗試 apply full schedule → 預期被拒；manager apply preview → 產生 RuleApplyRun 與 beforeSnapshot；PDF export → 回傳 jobId 並經 pending/processing/completed；rollback → 恢復 apply 前狀態。

## 紅線退回
- 將本案拆成多個獨立半成品交付，或只交 UI / AI / solver 任一單點而未跑通整合流程。
- 只有靜態 UI，不能 CRUD。
- AI 只是裝飾，不能產生 structured preview。
- AI 直接寫正式班表，沒有 preview/confirm/audit。
- 沒有 mock AI fallback，驗收受外部 API Key 阻塞。
- 混入 PromptForge 或提示詞生成內容。
- 無 seed data，驗收者無法一鍵重現。
- 排班規則被寫死成固定週期、固定 A/B 或固定每日班數。
- DuPont/Pitman/Panama/2-2-3 等命名制度無法調整 phase/天數/班別/組別 offset。
- Mock AI 只會做三休一，無法覆蓋 split shift/on-call/compressed week/skill coverage。
- 輪班制度只在 AI 文字或報表中出現，沒有投影到月曆 cell。
- 加班資訊強制顯示且不可切換，或加班 assignment 覆蓋原制度班別。
- 缺少 AI_SOLVER_SPEC / CALENDAR_PROJECTION_ALGORITHM / PRISMA_SCHEMA_SPEC 任一核心補件。
- proposal_full 與 SPEC 技術棧衝突未處理。


## Script M: API Layer Acceptance（Route Handler / curl 驗收）

目的：確認 Next.js Route Handlers 與 deterministic mock AI contract 可被程式化驗收，不只靠 UI 操作。

```bash
# 1. AI preview 必須回傳 structured SolverPreview
curl -s -X POST http://localhost:3000/api/ai/preview-schedule \
  -H "Content-Type: application/json" \
  -d '{"prompt":"五月排 A/B 兩組 2-2-3，週末至少兩人，缺口用加班候選補","startDate":"2026-05-01","endDate":"2026-05-31","mockMode":true}' \
  | jq '.previewToken and (.status | IN("ready","partial","blocked")) and (.calendarProjection | length > 0) and (.overtimeCandidates != null)'

# 2. Preview detail 必須可查回 calendarProjection / proposedAssignments
curl -s http://localhost:3000/api/ai/previews/<previewToken> \
  | jq '.calendarProjection and .proposedAssignments and .explanations'

# 3. Apply preview 必須建立 RuleApplyRun，不可直接無紀錄覆蓋正式班表
curl -s -X POST http://localhost:3000/api/ai/apply-preview \
  -H "Content-Type: application/json" \
  -d '{"previewToken":"<previewToken>","confirm":true}' \
  | jq '.applyRunId and .status == "applied" and .beforeSnapshot != null'

# 4. Export job state machine
curl -s -X POST http://localhost:3000/api/export/jobs \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"org_demo","locationId":"loc_demo","type":"ICS"}' \
  | jq '.data.jobId and (.data.status | IN("PENDING","PROCESSING","COMPLETED"))'

curl -s http://localhost:3000/api/export/jobs/<jobId> \
  | jq '.data.jobId and (.data.status | IN("PENDING","PROCESSING","COMPLETED","FAILED"))'

# 5. Rollback 必須透過 RuleApplyRun
# Note: applyRunId in URL path + required body fields organizationId (applyRunId is also echoed in body)
curl -s -X POST http://localhost:3000/api/ai/apply-runs/<applyRunId>/rollback \
  -H "Content-Type: application/json" \
  -d '{"applyRunId":"<applyRunId>","organizationId":"org_demo"}' \
  | jq '.data.success == true and .data.applyRunId'
```

通過條件：上述 API 在 `mockMode=true` 且沒有外部 AI key 時仍可得到 deterministic response；失敗時必須回傳 structured error，不得 silent fail。


## Script N — Calendar Display Settings / 班別自由呈現驗收
1. 以 admin 登入，進入 Settings → Calendar Display。
2. 新增/修改班別顯示：早班 shortLabel=`早`、夜班 shortLabel=`夜`、待命 shortLabel=`OC`，各自設定不同 badge 色與 glow 色。
3. 回到 `/calendar`，確認月曆 cell 顯示自訂短標與淺色暈染，不得退回固定 A/B 紅藍。
4. 切換 cell density：compact / standard / detailed，確認人名、人數、缺口 badge 顯示有差異。
5. 關閉 overtime overlay，確認 Expected Shift 仍可見，OT 只在 Day Inspector 或 export settings 可查。
6. 匯出 PDF/PNG/ICS，確認 export display settings 生效。

Fail if：UI 以 hard-coded A/B 顏色呈現、修改 display settings 後月曆不變、或 overtime overlay 覆蓋原班別。
