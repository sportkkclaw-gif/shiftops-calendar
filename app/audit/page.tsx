import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '審計日誌 — ShiftOps Calendar',
  description: '系統操作審計日誌：登入、資料異動、AI 操作與匯出記錄。',
};

const mockLogs = [
  { time: '2026-04-28 14:32', user: 'admin', action: 'AI 排班套用', detail: '套用 previewToken=preview_abc123 至 2026-04-01～2026-04-30', type: 'ai' },
  { time: '2026-04-28 14:30', user: 'admin', action: 'AI 排班預演', detail: '產生預演：做三休一，台北總部，2026年4月', type: 'ai' },
  { time: '2026-04-28 11:05', user: 'admin', action: '匯出 PDF', detail: 'jobId=job_001，建立月曆 PDF 匯出', type: 'export' },
  { time: '2026-04-28 10:48', user: 'admin', action: '調班審核', detail: '核准 swap-request #12（王小明 ↔ 李小華）', type: 'swap' },
  { time: '2026-04-28 09:22', user: 'admin', action: '登入', detail: '從 192.168.1.100 登入系統', type: 'auth' },
  { time: '2026-04-27 17:55', user: 'system', action: 'AI Rollback', detail: 'RuleApplyRun #7 rollback 至套用前狀態', type: 'ai' },
  { time: '2026-04-27 16:10', user: 'admin', action: '班表編輯', detail: '修改 2026-04-15 班別：B → A', type: 'edit' },
];

const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
  ai:     { label: 'AI 操作',   color: 'bg-purple-100 text-purple-700', icon: '🤖' },
  export: { label: '匯出',     color: 'bg-blue-100 text-blue-700',    icon: '📤' },
  swap:   { label: '調班',     color: 'bg-emerald-100 text-emerald-700', icon: '🔄' },
  auth:   { label: '登入',     color: 'bg-slate-100 text-slate-600', icon: '🔑' },
  edit:   { label: '編輯',     color: 'bg-amber-100 text-amber-700', icon: '✏️' },
};

export default function AuditPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <span className="font-bold text-xl text-indigo-700">審計日誌</span>
        </div>
        <div className="flex gap-3">
          <Link href="/reports" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            報表中心
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">🔍 審計日誌</h1>
          <p className="text-slate-600">完整記錄所有系統操作，包含 AI 操作、匯出、調班與資料異動。</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <button
              key={key}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${cfg.color} border-transparent hover:opacity-80`}
            >
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>

        {/* Log entries */}
        <div className="space-y-3">
          {mockLogs.map((log, i) => (
            <div key={i} className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${i % 2 === 0 ? '' : 'bg-slate-50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${typeConfig[log.type]?.color ?? 'bg-slate-100'}`}>
                {typeConfig[log.type]?.icon ?? '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-800">{log.action}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig[log.type]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                    {typeConfig[log.type]?.label ?? log.type}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">{log.detail}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-slate-400">{log.time}</div>
                <div className="text-xs text-slate-400">{log.user}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/reports" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📊 報表中心
          </Link>
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            📅 返回月曆
          </Link>
        </div>
      </div>
    </div>
  );
}
