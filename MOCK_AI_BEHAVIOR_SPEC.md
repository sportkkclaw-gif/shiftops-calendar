# MOCK_AI_BEHAVIOR_SPEC.md — Mock AI deterministic 行為規格

updated_at: 2026-04-28T12:50:59+08:00
status: P0_patch_complete_user_gate_pending

## 0. 原則
Mock AI 是驗收保險，不是假的聊天文字。無 AI Key 時，所有核心腳本仍要通過，並回傳與真 AI adapter 相同 schema。

## 1. 支援語句與行為
| Prompt pattern | Mock 行為 |
|---|---|
| 做三休一 | 產生 n_on_m_off phases: work=3/off=1 |
| 做四休四 | 產生 n_on_m_off phases: work=4/off=4 |
| A/B 輪替 | 產生 A/B shift sequence |
| 2-2-3 | 讀 named_pattern_seeds 的 2-2-3 defaultConfig |
| 9-13、17-21 | 產生 split shift segments |
| 待命到22:00 | 產生 on_call shift window |
| 四天十小時 | 產生 compressed_week config |
| 週末至少兩人，其中一人店長 | 產生 coverage + skill constraints |
| 今天是哪個班 | 讀 calendar_day_projections |
| B班缺人誰能補 | 讀 overtime_candidates |
| 匯出PDF | 建立 export job draft |

## 2. Mock response schema
Mock 必須回：
```json
{
  "intent": "generate_schedule",
  "semanticRules": [],
  "constraints": [],
  "solverPreview": {
    "status": "ready",
    "proposedAssignments": [],
    "calendarProjection": [],
    "coverageAlerts": [],
    "overtimeCandidates": []
  },
  "requiresConfirmation": true,
  "warnings": []
}
```

## 3. Seed dependency
Mock 只可依賴 demo seed：staff、shiftTypes、availability、skills、coverageRequirements、namedPatternSeeds。不得依賴外部服務。

## 4. 驗收紅線
- Mock 回覆只有文字 → fail。
- Mock 只支援做三休一 → fail。
- Mock 無法產生 calendarProjection → fail。
- Mock 無法產生 overtimeCandidates → fail。
