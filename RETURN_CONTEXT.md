# RETURN_CONTEXT — 20260428_shift_scheduler_web_supershift_style

verdict: returned_for_fix
review_event: review.rejected
updated_at: 2026-04-29T19:45:53+08:00
review_report: D:\WORK\成品區\_驗收報告\Simon\20260428_shift_scheduler_web_supershift_style\20260429T191924+0800_20260428_shift_scheduler_web_supershift_style_returned_for_fix.md

## must_fix
1. 補齊 ACCEPTANCE Script D/項目 16-18：member 調班申請、AI 替代建議、manager 核准，需 API + UI + audit + tests + live probe。
2. 補齊 ACCEPTANCE 項目 22-24：Google Calendar fallback、PWA installable、offline last-known schedule。
3. 補齊 ACCEPTANCE 項目 29-30：多制度並行與同組織多套制度互不覆寫的實作證據。
4. README 補核心 spec 文件引用與 Windows/Web 驗收入口。
5. 重新通過 director build.ready gate；product_completeness_evidence / sebastian_supagent_used blockers 清除後才能重送 Simon。

## must_not_do
- 不得只用 unit/api/e2e/build PASS 覆蓋 director final-product gate。
- 不得將 MVP/prototype/mock-only/partial preview 當 final product 送審。
- 不得使用 C:\WORK 或 /mnt/c/WORK 作驗收入口。

## resubmit_condition
上述 final-product blockers 全部修復，director build.ready gate 通過，RC/NEXT_STEP/TASK_META current header 改為 pending_review / next_agent=simon / next_event=build.ready 後再送。


## Sophie PM 補充 — 2026-04-30T07:37:12+08:00
- `PRODUCT_SPEC.md` 已補為本 returned-for-fix 任務的 PM 正規化規格入口。
- 本補充不改變 Simon 既有 returned_for_fix verdict；僅提供 Sebastian 續修時的權威規格來源。
