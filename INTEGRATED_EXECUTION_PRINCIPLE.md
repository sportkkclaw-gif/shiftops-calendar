# INTEGRATED_EXECUTION_PRINCIPLE.md — 單一整合開發原則

updated_at: 2026-04-28T18:22:57+08:00
status: active_execution_rule
source: Jason 校正「不要拆工，後面問題會很多」

## 0. 核心決策
本案不得拆工。本案不得以「拆工」方式交付給多個開發單元，也不得把 solver、schema、projection、overtime、UI、驗收分散成彼此獨立的半成品任務。

ShiftOps Calendar 是高度耦合系統：

- Prisma schema 決定 solver / projection / overtime / audit 是否能落地。
- Solver output 必須直接供 Calendar Projection 與 UI 使用。
- Calendar Projection 必須回寫 coverage / overtime / export / AI answer。
- RBAC / audit / rollback 必須包住所有寫入流程。

因此正式開發模式改為：

> 單一開發負責人 / 單一 repo / 單一 schema / 單一 API contract / 單一整合驗收 / 一次性完整交付。

---

## 1. 禁止事項
- 禁止把本案切成多個獨立子案交不同人做。
- 禁止先做 UI demo、後補 solver。
- 禁止先做 AI chat、後補 deterministic validation。
- 禁止先做 schema 半套、後補 projection/overtime。
- 禁止把 projection engine、solver engine、overtime candidate engine 分成互不驗證的模組交付。
- 禁止用「批次完成」當成可以分批驗收上線。

---

## 2. 允許事項：內部依賴順序
可以有施工順序，但它只是同一個開發者/同一個 repo 內部的依賴排序，不是拆工、不是分段產品版本、不是分批交付。

正確表述：

> 先建立 schema contract，再實作 solver，再接 projection，再接 UI，最後做整合驗收。

錯誤表述：

> 第一階段先交 UI；第二階段再補 AI；第三階段再補加班。

---

## 3. 一體化開發順序
本案仍需要順序，但所有順序都必須維持同一條整合主線：

1. 凍結權威規格與資料模型。
2. 建立 Next.js + Prisma + seed 基座。
3. 實作 deterministic core：solver / projection / coverage / overtime candidate。
4. 實作 AI adapter：真 AI 與 mock AI 都輸出同一 structured payload。
5. 實作 Calendar / Day Inspector / AI panel UI，直接讀 projection，不自行推算。
6. 實作 apply / rollback / audit / RBAC。
7. 實作 export / PWA / reports。
8. 跑完整 Script A–M，一次性驗收。

注意：以上是同一開發流程的依賴順序，不可拆成多個可獨立交付的外包任務。

---

## 4. 開發者交付要求
Sebastian 接手時必須一次承接完整產品，不得只回報單一模組完成。

完成回報必須包含：
- repo path
- 啟動方式
- schema/migration/seed 結果
- solver/projection/overtime integration evidence
- AI mock mode evidence
- Calendar UI evidence
- apply/rollback/audit evidence
- RBAC evidence
- export/PWA evidence
- Script A–M 結果

---

## 5. 驗收紅線
以下任一出現即退回：
- UI 可看但 solver 未接。
- Solver 可跑但月曆 projection 不讀結果。
- AI 可回話但不能產生 SolverPreview。
- 加班候選與 coverage gap 未串接。
- RBAC 只做 UI 隱藏，API 未擋。
- Rollback/audit 未包住 apply。
- 各模組各自可跑但 Script A–M 整合流程不通。
