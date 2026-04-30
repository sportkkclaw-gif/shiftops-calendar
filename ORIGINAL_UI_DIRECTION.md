# ORIGINAL_UI_DIRECTION.md — 排班 Web 原創產品 UI 方向 v0.2

## 0. Jason 校正
Jason 明確要求：不要複製提供的 Supershift 圖片；要用 Sophie 的產品開發想法做成新的 UI 圖片。

因此 v0.2 改為：
- 保留「深色、專業、工具型」這個情緒方向。
- 不複製 Supershift 的手機版排版。
- 改成桌面 Web / PWA 原創產品架構。
- 加入排班產品真正需要的主控台、規則建構器、人力覆蓋報告、分享列印中心。

## 1. 產品 UI 概念
產品暫名：**班表中樞 ShiftOps Calendar**

定位：
> 給門市、診所、輪班團隊使用的排班 Web / PWA；核心不是漂亮月曆，而是「排班、查缺口、調人力、匯出」的一體化工作台。

## 2. 原創 UI 四張圖

### 2.1 班表中樞 / 月曆主控台
檔案：`mockups_original_product/mockup_original_01_schedule_command_center.png`

設計想法：
- 左側 Web sidebar，而不是手機底部 tab。
- 中央是月曆排班 board。
- 上方有 KPI：本月工時、缺口班次、已排人員、匯出狀態。
- 右側 day inspector：選某一天後看到人員、覆蓋狀態、備註、衝突。
- 這是主要工作台，不是純月曆。

### 2.2 排班建構器 / 規則編輯
檔案：`mockups_original_product/mockup_original_02_shift_rule_builder.png`

設計想法：
- 讓使用者建立「做三休一」「A/B 班輪替」「假日例外」等規則。
- 中央是規則 canvas 與週期預覽。
- 右側是 live preview 與風險提醒。
- 這是本產品的差異化功能：不是每天手填，而是用規則生成班表。

### 2.3 人力覆蓋報告
檔案：`mockups_original_product/mockup_original_03_coverage_report.png`

設計想法：
- 不做複雜 BI，而是回答排班主管最在意的問題：哪天缺人、誰超時、哪班覆蓋不足。
- Heatmap + stacked bar + 異常清單 + 建議動作。
- 報告要能直接導回調班動作。

### 2.4 分享與列印中心
檔案：`mockups_original_product/mockup_original_04_share_print_center.png`

設計想法：
- 不照抄手機分享頁，改成 Web 原生 split layout。
- 左側 PDF / 月曆預覽。
- 右側四步驟設定：範圍、內容、格式、分享。
- 支援 PDF、PNG、Google Calendar、ICS、複製連結。

## 3. UI 原則
1. **Web-native，不是手機 App 放大。** Desktop 應使用 sidebar、inspector、split panels。
2. **月曆只是主畫布，不是全部功能。** 旁邊要有狀態、衝突、人員、動作。
3. **排班規則是產品核心。** 必須有規則建構器，不只是手動新增班次。
4. **報告要可行動。** 發現缺班後能補人、調班、提醒。
5. **匯出是工作流。** PDF/PNG/ICS/Google Calendar 要有專門中心。
6. **不浮誇。** 不做大型 ERP，不做無意義 AI 光效；保持可開發工具感。

## 4. 後續完整開發案應包含的頁面
1. 班表中樞 `/calendar`
2. 日詳情 Inspector
3. 新增/編輯班次 Modal
4. 排班建構器 `/builder`
5. 規則模板庫 `/builder/templates`
6. 人員管理 `/staff`
7. 班別設定 `/shifts`
8. 假日例外 `/holidays`
9. 調班流程 `/swap-requests`
10. 人力覆蓋報告 `/reports/coverage`
11. 工時統計 `/reports/hours`
12. 異常清單 `/alerts`
13. 分享與列印中心 `/export`
14. 匯出歷史 `/export/history`
15. 設定 `/settings`
16. 訂閱方案 `/billing`

## 5. 本輪狀態
已產生 v0.2 原創 UI 圖。等待 Jason 判斷：
- 這種 Web 原創方向是否比「照 Supershift 手機版」更符合需求。
- 哪一張圖的方向要當主視覺。
- 是否要我接著寫完整 developer-ready 開發案。
