# UI_LAYOUT_SPEC.md — 排班 Web 開發案排版設計規格 v0.1

## 0. 重要校正

本案是 **新的排班 Web 開發案**，不是 PromptForge Studio，不屬於提示詞生成工具。

產品方向：
> 依照 Jason 提供的 Supershift 截圖，設計一套深色、iOS-like、工具型、可每日使用的排班 Web / PWA 介面。

## 1. 設計目標

做一個專業但不浮誇的排班工具 Web：
- 主要畫面是月曆排班。
- 支援 A/B 班或多班別標籤。
- 支援假期、節氣、農曆、備註。
- 支援分享、列印、PDF 匯出。
- 支援更多設定、偏好、匯出、鬧鐘提醒。
- 風格參考 Supershift：黑底、深灰卡片、大圓角、粗體白字、浮動底部 tab。

## 2. 視覺語言

### 2.1 色彩
```css
--bg: #000000;
--surface: #202020;
--surface-2: #242426;
--divider: #111113;
--text: #FFFFFF;
--muted: rgba(255,255,255,.45);
--selected-day: #1F2F66;
--shift-a: #FF5368;
--shift-b: #3DAEF2;
--event-dot: #FF9500;
--accent-blue: #007AFF;
--tab-active: #4A4A4D;
--fab-bg: #F2F2F2;
--fab-icon: #1A1A1A;
```

### 2.2 字體
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang TC", "Noto Sans TC", Inter, system-ui, sans-serif;
```

### 2.3 圓角與間距
- App shell：黑底滿版。
- 主要容器 max-width：1180–1320px。
- 手機設定頁 max-width：640–720px。
- 大卡片 radius：32–56px。
- 底部 tab radius：999px。
- row 高度：mobile 88–104px；desktop 104–128px。

## 3. Web Responsive 版型

### Mobile < 768px
- 單欄。
- 月曆滿寬，左右 16–24px。
- 底部 floating tab 固定。
- FAB 在右下，位於 tab 上方。
- 設定頁保持 Supershift 原始單欄大卡片。

### Tablet 768–1199px
- 月曆 max-width 900–1040px 置中。
- 設定頁 max-width 640px。
- 分享列印可用上下布局：上方 preview，下方 options。

### Desktop >= 1200px
- 主畫面使用 centered app shell。
- Calendar Dashboard 可保留底部 tab，讓 Web 仍有 App 感。
- Share & Print 改成左右雙欄：左 preview，右 options。
- Settings 可保留窄欄卡片，不拉滿全寬。

## 4. 頁面 1：行事曆 Dashboard

### 路徑
`/calendar`

### 排版
- Header：左側超大月份標題 `2026年5月`。
- Header 右側：膠囊工具列，含團隊/分享與月曆切換 icon。
- 主體：大圓角深灰月曆容器。
- 月曆：7 欄，6 週列。
- 每格：日期 + 農曆 + 班別 badge + 節日/節氣 marker。
- 右下：白色 FAB，鉛筆 icon。
- 底部：floating tab：行事曆 / 報告 / 班次 / 更多。

### 元件規格
- `MonthHeader`
- `CalendarGrid`
- `CalendarCell`
- `ShiftBadge`
- `HolidayMarker`
- `BottomTabBar`
- `FloatingEditButton`

## 5. 頁面 2：更多 / 設定

### 路徑
`/more`

### 排版
- 黑底。
- 上方可放品牌插畫 banner。
- Section + Card：
  - Supershift Cloud：帳戶。
  - Supershift Pro：行事曆匯出、行事曆活動、PDF 匯出。
  - 鬧鐘：班次鬧鐘提醒。
  - 行事曆：假期、週數、每星期開始日、時間格式、其他曆法。
  - 偏好設定：顯示選項、深色模式、應用程式圖示、小工具、語言。
- 每列右側 chevron。
- 更多 tab active。

### 元件規格
- `SettingsHeroBanner`
- `SettingsSection`
- `SettingsCard`
- `SettingsRow`
- `ChevronIcon`
- `CloudStatusIcon`

## 6. 頁面 3：分享並列印 / PDF 匯出

### 路徑
`/share-print`

### 排版
- Header：返回圓形按鈕 + 大標題 `分享並列印`。
- Segmented control：列表 / 月 / 年。
- Desktop：左側白色紙張 preview，右側深灰 options panel。
- Mobile：preview 在上，options 在下。
- Options：內容、標頭、外觀。
- 底部固定 action bar：返回 / 分享。

### Options 必含
- 範圍。
- 班次。
- 行程。
- 圖示。
- 時間。
- 標題。
- 地點。
- 備註。
- 休息時間。
- 時長。
- 空白行。
- App 標誌。

## 7. 頁面 4：班次管理

### 路徑
`/shifts`

### 排版
- 大標題：班次。
- 深灰卡片列表。
- A班 / B班 色塊設定。
- 每個班次 row：名稱、顏色、時間、循環規則、chevron。
- 新增班次 FAB。

## 8. 頁面 5：報告

### 路徑
`/reports`

### 排版
- 大標題：報告。
- Summary cards：本月工時、A班天數、B班天數、休假天數。
- 深灰卡片 + simple bar chart。
- 不做複雜 BI dashboard。

## 9. Mockups

已產生 Web 版三張：
1. `mockups/mockup_01_calendar_dashboard_web.png`
2. `mockups/mockup_02_more_settings_web.png`
3. `mockups/mockup_03_share_print_web.png`

## 10. 不可偏移原則

1. **這是排班產品，不是 PromptForge。** 不得混入提示詞生成、AI prompt、模板庫等內容。
2. **工具感優先。** 不做浮誇 AI SaaS 首頁。
3. **深色 iOS-like。** 黑底、深灰卡片、大圓角、粗白字是核心風格。
4. **月曆是主體。** 首頁/主頁必須是排班月曆，不是 landing page。
5. **匯出列印是核心。** 分享、列印、PDF 匯出屬於完整交付內容。
6. **功能務實。** 報告、班次、更多設定都要簡潔可開發，不做大型 ERP。

## 11. 交付狀態（已完成）

Jason 已確認排版方向；developer-ready 開發案已補齊並完成 Sebastian handoff：
- `proposal_full.md`
- `SPEC.md`
- `FULL_BUILD_CHECKLIST.md`
- `ACCEPTANCE.md`
- `RISKS.md`
- `SEBASTIAN_START_PROMPT.md`

`plan.ready` 已取得 HTTP 202（delivery_id `1777374140999`）；Sophie source 維持 `transferred_to_sebastian`、`next_agent=null`、`next_event=null`，不得重送 dispatcher event。
