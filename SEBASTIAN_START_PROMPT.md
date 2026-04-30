# FINAL FROZEN PACKAGE — Sebastian Start Prompt

Jason 已審核 OK 三張 UI/功能示意圖。本案正式進入單一整合開發，不得拆工。

# SEBASTIAN_START_PROMPT.md — 班表中樞完整版開發指令

Sebastian，請開發「班表中樞 ShiftOps Calendar」完整版。這是 AI-first 排班 Web/PWA，不是半成品 demo，也不是先小做再後補的任務。

重要：本案不得拆工、不得分批交付、不得把 UI / AI / solver / projection / overtime / schema 分散成獨立半成品。你必須以單一 repo、單一 schema、單一 API contract、單一整合驗收一次性完成。施工可以有內部依賴順序，但不可變成分段產品或分拆任務。

必讀：INTEGRATED_EXECUTION_PRINCIPLE.md、proposal_full.md、SPEC.md、AI_ENGINE_SPEC.md、SHIFT_PATTERNS_SEMANTIC_LIBRARY.md、CALENDAR_SHIFT_DISPLAY_MODEL.md、AI_SOLVER_SPEC.md、CALENDAR_PROJECTION_ALGORITHM.md、OVERTIME_FLOW_SPEC.md、RBAC_MATRIX.md、PRISMA_SCHEMA_SPEC.md、MOCK_AI_BEHAVIOR_SPEC.md、FULL_BUILD_CHECKLIST.md、ACCEPTANCE.md、RISKS.md、ORIGINAL_UI_DIRECTION.md。

產品邊界：
- 這是 AI-first 排班 Web/PWA。
- AI 是主要操作入口：自然語言排班、修正、查缺口、調班建議、匯出。
- AI 不得直接寫正式班表；必須 preview → human confirm → apply → audit log。
- 不得混入 PromptForge。
- 不得複製 Supershift 手機版。
- 必須做原創 Web-native 工具介面：sidebar、calendar board、right inspector、AI assistant panel、reports、export center。

最低完成：登入/RBAC、人員、班別、假日農曆、月曆、日詳情、AI Assistant、AI preview/apply/revise、deterministic solver、calendar projection、overtime candidates/overlay、覆蓋警告、調班、AI 報告、PDF/PNG/ICS async export、Mock AI fallback、PWA、seed、測試、README。

完成後回報：單一 repo 整合證據、路徑、啟動方式、demo 帳號、AI Key / Mock AI 設定方式、頁面清單、API 清單、DB schema、seed 指令、AI 驗收腳本結果、匯出證據、PWA 證據、未完成風險。


## Final frozen additions
- 必讀 `CALENDAR_CELL_DISPLAY_SETTINGS_SPEC.md`：月曆格班別呈現可自由設定，不得 hard-code 固定 A/B。
- 必須一次整合 schema / solver / projection / UI / overtime / RBAC / audit / rollback / export / PWA。
- 完成後只可回報整合驗收證據，不接受單一模組 demo。
