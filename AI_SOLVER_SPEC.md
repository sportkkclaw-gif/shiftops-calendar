# AI_SOLVER_SPEC.md — AI 排班 Solver 實作合約

updated_at: 2026-04-28T12:50:59+08:00
status: P0_patch_complete_user_gate_pending

## 0. 目的
AI 只能負責自然語言解讀、解釋與排序；正式排班結果必須由 deterministic solver 驗證。流程：

Natural Language → AI Interpret → Semantic Rules / Constraints → Deterministic Solver → Preview → Human Confirm → Apply → Audit / Rollback

## 1. Solver 輸入
```ts
type SolverInput = {
  organizationId: string
  locationId: string
  dateRange: { start: string; end: string }
  staff: StaffProfile[]
  shiftTypes: ShiftType[]
  semanticRules: ShiftRuleSemantic[]
  constraints: Constraint[]
  availabilityWindows: StaffAvailabilityWindow[]
  skillCertifications: StaffSkillCertification[]
  coverageRequirements: CoverageRequirement[]
  existingAssignments: ShiftAssignment[]
  policyProfile: SchedulePolicyProfile
  displayPreferences: CalendarDisplayPreferences
}
```

## 2. Constraint 分級
### 2.1 Hard constraints — 違反即 block
- 法規 / policy：最大週工時、最小休息間隔、不可用時段。
- 資格：必要角色/證照未滿足。
- 同一人同時段重疊。
- 使用者明確指定不可排。

### 2.2 Soft constraints — 可犧牲但要扣分與解釋
- 偏好班別。
- 工時平均。
- 週末輪休公平。
- 命名制度 seed 的預設細節。

## 3. Solver pipeline
1. Normalize rules：把 fixed / rotating / named_pattern / split_shift / on_call / compressed_week 全部轉成 canonical phases。
2. Project expected shifts：依 dateRange 產生每日 expected shift slots。
3. Expand staff eligibility：依角色、技能、availability、policy 篩可排人員。
4. Fill required coverage：先滿足 hard constraints 與最低覆蓋。
5. Optimize soft constraints：以 score 排序，降低工時不均、偏好違反、連班風險。
6. Generate warnings：對無法滿足的 soft/hard issue 給 reason。
7. Emit preview：輸出 proposedAssignments、calendarProjection、coverageAlerts、overtimeCandidates。

## 4. 無解回應
```json
{
  "status": "blocked",
  "blockingReasons": [
    { "code": "NO_CERTIFIED_MANAGER", "date": "2026-05-03", "message": "週末 B 班需要店長，但無可用店長" }
  ],
  "partialPreviewAllowed": true,
  "suggestedFixes": ["降低週末店長硬限制", "新增可用店長", "允許跨店支援"]
}
```

## 5. Scoring
每位候選人/assignment 產生 `score 0..1`：
- +0.30 符合技能/角色。
- +0.20 符合 availability。
- +0.15 不超週工時。
- +0.15 休息間隔充足。
- +0.10 工時公平性改善。
- +0.10 符合個人偏好。

任一 hard constraint 違反 → candidate invalid，不得進入可確認 preview。

## 6. Preview output contract
```ts
type SolverPreview = {
  previewToken: string
  status: 'ready' | 'partial' | 'blocked'
  proposedAssignments: ShiftAssignmentDraft[]
  calendarProjection: CalendarDayProjection[]
  coverageAlerts: CoverageAlertDraft[]
  overtimeCandidates: OvertimeCandidate[]
  warnings: SolverWarning[]
  explanation: string
  beforeSnapshotRef: string
}
```

## 7. Mock solver 範圍
Mock mode 必須 deterministic 支援：
- fixed_shift：固定早班。
- n_on_m_off：做三休一、做四休四。
- named_pattern：2-2-3 seed。
- split_shift：09-13 / 17-21。
- on_call：週末待命到 22:00。
- compressed_week：週一至週四四天十小時。
- skill_coverage：週末至少兩人，其中一人店長。
- overtime_candidates：缺 1 人時依 seed data 產生 2–3 位候選與 reason。

Mock 不需最佳化全域班表，但必須回傳完整 structured payload，不可只回文字。

## 8. 驗收
- Unit：constraint parser、eligibility filter、score calculator、hard block、soft warning。
- API：`POST /api/ai/preview-schedule` 在 mock mode 回傳 SolverPreview。
- E2E：Script G/H/I/J 均可在無 AI Key 下通過。
