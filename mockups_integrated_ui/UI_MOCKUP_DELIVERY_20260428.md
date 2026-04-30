# UI_MOCKUP_DELIVERY_20260428 — ShiftOps Calendar 三張示意圖交付

updated_at: 2026-04-28T18:33:00+08:00
status: delivered_for_jason_review
source_request: Jason 要求「根據現在的企畫書，你做成三張UI示意圖跟功能圖」

## 1. 交付檔案

### 圖 1 — Calendar Command Center（月曆主控台）
- PNG: `shiftops_ui_01_calendar_command_center.png`
- HTML source: `shiftops_ui_01_calendar_command_center.html`
- 表達重點：
  - 月曆 cell 直接顯示制度投影、已排人員、缺口、OT badge。
  - 右側 Day Inspector 與 AI Assistant 讀 CalendarDayProjection，不自行猜制度。
  - 支援 A/B、OFF、on-call、split、2-2-3、4休4 等多制度狀態混合呈現。

### 圖 2 — Day Inspector + Overtime Candidate Flow（單日檢視與加班候選）
- PNG: `shiftops_ui_02_day_overtime_flow.png`
- HTML source: `shiftops_ui_02_day_overtime_flow.html`
- 表達重點：
  - 加班不是班別覆蓋，而是 Coverage Gap 的 optional overlay。
  - 流程為 Coverage Gap → Candidate Engine → AI Ranking → Manager Confirm → Reproject。
  - AI 只排序與解釋，不跳過候選引擎直接指定人。

### 圖 3 — Functional Architecture（功能架構圖）
- PNG: `shiftops_ui_03_functional_architecture.png`
- HTML source: `shiftops_ui_03_functional_architecture.html`
- 表達重點：
  - 單一整合流程：schema → solver → projection → UI → apply / rollback / audit。
  - 單一 repo / 單一 schema / 單一 API contract / 單一整合驗收。
  - 明確標示 NO SPLIT WORK，模組 demo 不可單獨驗收。

## 2. 視覺方向
- 深色 iOS-like 工具介面。
- 大圓角卡片、分層 panel、少量高價值色彩標籤。
- 功能導向，不做浮誇 marketing 風。
- 對齊 Supershift 參考：黑底、深灰卡片、白字、月曆格、紅藍班別、橘色 OT/警示。

## 3. 與規格一致性
- 未 hard-code 單一固定制度；示意圖同時呈現 fixed、A/B、N-on/M-off、2-2-3、4休4、split、on-call、skill gap、OT overlay。
- 加班保持 overlay，不覆蓋 Expected Shift。
- AI 不直接寫正式班表；AI output 必須走 structured action + deterministic solver + manager confirm。
- 功能圖明確維持不得拆工、單一整合驗收。

## 4. Jason 可審核重點
1. 月曆主畫面是否符合「一看就知道今天是哪班、缺誰、可不可以加班補」。
2. Day Inspector 是否足夠清楚表達加班候選與人工確認。
3. 功能圖是否足夠清楚傳達不得拆工與單一整合交付。
4. 色彩、密度、專業感是否接近預期。


## 5. 2026-04-28 視覺修正：月曆格淺色系暈染
- 依 Jason 指示，`shiftops_ui_01_calendar_command_center.html/png` 已更新。
- 月曆 day cell 從純深灰改為深色底 + 淺色系 pastel glow / soft tint。
- 不同 weekday / cell 呈現粉、藍、紫、綠、橘等低飽和暈染，保留深色工具感。
- selected day 加強藍色外暈，仍維持日期、班別 badge、缺口 chip 可讀性。
