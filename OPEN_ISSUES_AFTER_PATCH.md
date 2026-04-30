# OPEN_ISSUES_AFTER_PATCH.md — 補件後剩餘問題

updated_at: 2026-04-28T12:56:50+08:00
status: tracking

## 已補 P0/P1 文件
- AI_SOLVER_SPEC.md
- CALENDAR_PROJECTION_ALGORITHM.md
- OVERTIME_FLOW_SPEC.md
- RBAC_MATRIX.md
- PRISMA_SCHEMA_SPEC.md
- MOCK_AI_BEHAVIOR_SPEC.md
- proposal_full.md 第4/5/8/9/10/11/18/19/26節：已清除舊 Vite/Express/client-server split 衝突，統一 Next.js 15 App Router + Route Handlers + Prisma/PostgreSQL
- ACCEPTANCE.md：已新增 Script M API Layer Acceptance
- RISKS.md：已補 P0 proposal rewrite status

## 仍需後續精修
1. 若 Jason 確認方向，需產出最終 Sebastian 開工包版本並再做一次整包一致性檢查，不可直接用未核准狀態送出。
2. user gate 維持：`waiting_user_mockup_approval` / `next_agent=user` / `next_event=null`；未獲 Jason 明確核准前不得 plan.ready。
