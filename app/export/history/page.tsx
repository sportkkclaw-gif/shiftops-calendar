import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '匯出歷史 — ShiftOps Calendar',
  description: 'PDF / PNG / ICS 匯出任務的完整歷史記錄與狀態追蹤。',
};

const mockHistory = [
  { jobId: 'job_001', type: 'PDF', status: 'completed', created: '2026-04-15 10:23', size: '~2.4 MB' },
  { jobId: 'job_002', type: 'ICS', status: 'completed', created: '2026-04-14 09:11', size: '~48 KB' },
  { jobId: 'job_003', type: 'PNG', status: 'processing', created: '2026-04-16 14:55', size: '—' },
  { jobId: 'job_004', type: 'PDF', status: 'failed', created: '2026-04-10 16:30', size: '—' },
  { jobId: 'job_005', type: 'ICS', status: 'pending', created: '2026-04-16 15:01', size: '—' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
  processing: { label: '處理中', color: 'bg-blue-100 text-blue-700' },
  pending: { label: '等待中', color: 'bg-amber-100 text-amber-700' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-700' },
};

export default function ExportHistoryPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📜</span>
          <span className="font-bold text-xl text-indigo-700">匯出歷史</span>
        </div>
        <div className="flex gap-3">
          <Link href="/export" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            匯出中心
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">📜 匯出歷史</h1>
          <p className="text-slate-600">所有 PDF / PNG / ICS 匯出任務的完整記錄。點選已完成任務可下載檔案。</p>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['任務 ID', '格式', '狀態', '建立時間', '檔案大小'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((row, i) => (
                <tr key={row.jobId} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.jobId}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[row.status]?.color}`}>
                      {statusConfig[row.status]?.label ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{row.created}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{row.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-amber-800 mb-2">💡 資料來源說明</h3>
          <p className="text-sm text-amber-700">
            匯出歷史來自 <code className="bg-amber-100 px-1 rounded">/api/export/jobs</code> 及{' '}
            <code className="bg-amber-100 px-1 rounded">/api/export/jobs/[jobId]</code> API 的非同步任務佇列。
            實際任務資料由後端資料庫（Prisma + SQLite）持久化儲存。此頁面顯示 Mock 示範資料。
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/export" className="flex-1 text-center px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            + 新建匯出任務
          </Link>
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📅 返回月曆
          </Link>
        </div>
      </div>
    </div>
  );
}
