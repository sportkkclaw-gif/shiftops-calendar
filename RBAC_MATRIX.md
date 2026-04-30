# RBAC_MATRIX.md — 權限矩陣

updated_at: 2026-04-28T12:50:59+08:00
status: P1_patch_complete_user_gate_pending

## 0. 角色
- admin：組織管理者，可跨 location。
- manager：排班管理者，限自己 location/team。
- member：一般成員，限個人資料與調班申請。

## 1. 權限矩陣
| Action | Admin | Manager | Member |
|---|---:|---:|---:|
| 登入 / 查看自己班表 | Y | Y | Y |
| 查看全月班表 | Y | Y(location) | read-only assigned/self |
| Staff CRUD | Y | Y(location) | N |
| Shift Type CRUD | Y | Y(location) | N |
| Holiday / policy 設定 | Y | N | N |
| AI interpret | Y | Y | Y(self scope) |
| AI preview schedule | Y | Y(location) | self/swap only |
| AI apply full schedule | Y | Y(location) | N |
| AI revise preview | Y | Y(location) | own request only |
| Inline edit assignment | Y | Y(location) | N |
| 建立 swap request | Y | Y | Y |
| 核准 / 拒絕 swap | Y | Y(location) | N |
| 查看 overtime candidates | Y | Y(location) | self eligibility only |
| 確認 overtime assignment | Y | Y(location) | N |
| Calendar overtime display preference | Y | Y | Y(personal only) |
| Export PDF/PNG/ICS | Y | Y(location) | self schedule only |
| View audit log | Y | Y(location filtered) | N |
| Rollback apply run | Y | Y(location, latest run) | N |
| Billing / plan limits | Y | read-only | N |

## 2. AI action scope
- Member 的 AI query 必須套用 row-level filter：只能讀自己的班、自己的 swap、公開公告。
- Manager 的 AI apply 不得跨 location。
- Admin 可跨 location，但所有 apply 必須 audit。

## 3. 批量操作定義
- full schedule apply：影響超過 1 天或超過 3 筆 assignment。
- single edit：單日單筆 assignment。
- rollback：以 applyRunId 為單位。

## 4. 驗收
- member 無法 apply preview。
- manager 無法操作非自己 location 的 assignment。
- admin 可讀所有 audit。
- member 可問 AI「我下週哪天上班」，不可問「全部人本月工時」。
