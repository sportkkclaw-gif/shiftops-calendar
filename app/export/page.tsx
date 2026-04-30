'use client'
import Link from 'next/link';

const exportTypes = [
  { type: 'PDF', icon: '📄', desc: '完整月曆班表 PDF，含日期、班別、人員、缺口標記', color: 'bg-red-50 border-red-200' },
  { type: 'PNG', icon: '🖼️', desc: '高解析度月曆圖片，適合公告或簡報使用', color: 'bg-blue-50 border-blue-200' },
  { type: 'ICS', icon: '📅', desc: 'iCalendar 格式，可匯入 Google Calendar 或 Outlook', color: 'bg-emerald-50 border-emerald-200' },
];

export default function ExportPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📤</span>
          <span className="font-bold text-xl text-indigo-700">匯出中心</span>
        </div>
        <div className="flex gap-3">
          <Link href="/export/history" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            匯出歷史
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">📤 匯出中心</h1>
          <p className="text-slate-600">將班表匯出為 PDF、PNG 或 ICS 格式，支援非同步任務追蹤。</p>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-8">
          {exportTypes.map((e) => (
            <div key={e.type} className={`border rounded-xl p-5 ${e.color}`}>
              <div className="text-3xl mb-3">{e.icon}</div>
              <h3 className="font-bold text-lg mb-1">{e.type}</h3>
              <p className="text-sm text-slate-600 mb-4">{e.desc}</p>
              <button
                className="w-full px-3 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/export/jobs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        organizationId: 'org_demo',
                        locationId: 'loc_demo',
                        type: e.type,
                        options: { dateRange: { start: '2026-04-01', end: '2026-04-30' } },
                      }),
                    });
                    const json = await res.json();
                    alert(`匯出任務已建立: ${json.data?.jobId ?? 'ok'}`);
                  } catch {
                    alert('匯出功能僅在完整後端環境可用');
                  }
                }}
              >
                建立匯出任務
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-3">📋 匯出 API 說明</h3>
          <div className="text-sm text-slate-600 space-y-2">
            <p>• <code className="bg-slate-100 px-1 rounded">POST /api/export/jobs</code> — 建立匯出任務</p>
            <p>• <code className="bg-slate-100 px-1 rounded">GET /api/export/jobs/:jobId</code> — 查詢任務狀態</p>
            <p>• 任務狀態：<span className="text-amber-600">pending</span> → <span className="text-blue-600">processing</span> → <span className="text-emerald-600">completed</span></p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/export/history" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📜 查看匯出歷史
          </Link>
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📅 返回月曆
          </Link>
        </div>
      </div>
    </div>
  );
}
