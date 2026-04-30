# OVERTIME_FLOW_SPEC.md — 加班候選與可選顯示流程

updated_at: 2026-04-28T12:50:59+08:00
status: P1_patch_complete_user_gate_pending

## 0. 原則
加班不是原制度班別；加班是 coverage gap 的補位 assignment 與 optional overlay。

## 1. 責任分工
- Coverage Engine：發現缺口。
- Candidate Engine：依 availability、hours、rest、skill 產生候選。
- AI：解釋與排序，不可憑空創造候選。
- Manager：確認或拒絕。
- Calendar Projection：依 display mode 顯示 OT overlay。

## 2. 流程
1. `coverageStatus.missingCount > 0`。
2. Candidate Engine 查詢可用人員。
3. 產生 `overtime_candidates`。
4. AI 生成 reason/risk explanation。
5. Day Inspector 顯示候選。
6. Manager 點選候選並確認。
7. 建立 `overtime_assignments` 與 `shift_assignments.assignmentType='overtime'`。
8. 寫入 `audit_events`。
9. 重新計算 calendar projection。

## 3. Candidate eligibility
候選必須通過：
- 當日可用或可延長。
- 不違反最小休息間隔。
- 不超過週工時硬上限。
- 符合必要技能/角色。
- 不與既有班次重疊。

## 4. Overtime display modes
```ts
type OvertimeDisplayMode = 'hide' | 'badge' | 'candidates' | 'assignments'
```
- hide：月曆不顯示加班，只在 Inspector 顯示。
- badge：顯示 OT + 數量。
- candidates：顯示候選簡碼。
- assignments：顯示已確認加班人員。

## 5. API
- `GET /api/overtime/candidates?date=&shiftTypeId=&locationId=`
- `POST /api/overtime/assignments`
- `DELETE /api/overtime/assignments/:id`
- `PATCH /api/settings/calendar-display`

## 6. 建立 overtime assignment request
```json
{
  "date": "2026-05-08",
  "targetShiftTypeId": "shift_b",
  "staffId": "staff_007",
  "sourceCandidateId": "otc_001",
  "note": "補 B 班缺口",
  "displayModeAfterApply": "badge"
}
```

## 7. 驗收
- B班缺1人時，Day Inspector 顯示 2–3 位候選與 riskFlags。
- 不合資格人員不出現在可確認候選，只能列在 rejected reason。
- 確認加班後，正式班別不消失，OT overlay 依設定顯示。
- 關閉 overlay 後，Inspector 仍可查到 overtime assignment。
