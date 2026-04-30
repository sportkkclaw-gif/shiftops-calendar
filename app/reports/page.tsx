import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '出勤報表 — ShiftOps Calendar',
  description: '員工出勤統計、加班時數、缺口分析等報表。',
};

const reportTypes = [
  {
    icon: '📅',
    title: '月出勤統計',
    desc: '每月員工出勤時數、请假天数、出勤率分析。',
    link: '/calendar',
    cta: '查看月曆',
  },
  {
    icon: '⏰',
    title: '加班時數報表',
    desc: 'OvertimeCandidate 產生的加班候選記錄，支援分數排序。',
    link: '/export',
    cta: '匯出報表',
  },
  {
    icon: '⚠️',
    title: '缺口分析',
    desc: 'CoverageStatus 為 "low" 的日期清單，協助快速識別人力缺口。',
    link: '/calendar',
    cta: '查看缺口',
  },
  {
    icon: '🔄',
    title: '調班歷史',
    desc: 'SwapRequest 調班申請與審核歷史記錄。',
    link: '/swap-requests',
    cta: '調班管理',
  },
  {
    icon: '📤',
    title: '匯出歷史',
    desc: 'PDF / PNG / ICS 匯出任務的狀態與下載連結。',
    link: '/export/history',
    cta: '查看歷史',
  },
  {
    icon: '🤖',
    title: 'AI 復原日誌',
    desc: 'RuleApplyRun 的 Rollback 操作歷史。',
    link: '/audit',
    cta: '審計日誌',
  },
];

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <span className="font-bold text-xl text-indigo-700">出勤報表</span>
        </div>
        <div className="flex gap-3">
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            月曆
          </Link>
          <Link href="/export" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            匯出中心
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">📊 出勤報表</h1>
          <p className="text-slate-600">查看員工出勤統計、加班時數、缺口分析等各種報表。</p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {reportTypes.map((r) => (
            <Link
              key={r.title}
              href={r.link}
              className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="text-3xl mb-3">{r.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{r.title}</h3>
              <p className="text-sm text-slate-500 mb-3">{r.desc}</p>
              <span className="text-xs text-indigo-600 font-medium">{r.cta} →</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-4">⚡ 快速操作</h3>
          <div className="flex gap-3">
            <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 font-medium hover:bg-indigo-100 transition-colors">
              📅 開啟月曆
            </Link>
            <Link href="/export" className="flex-1 text-center px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 font-medium hover:bg-indigo-100 transition-colors">
              📤 匯出 PDF
            </Link>
            <Link href="/swap-requests" className="flex-1 text-center px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 font-medium hover:bg-indigo-100 transition-colors">
              🔄 調班管理
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
