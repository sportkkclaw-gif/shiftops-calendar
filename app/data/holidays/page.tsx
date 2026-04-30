import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '節日設定 — ShiftOps Calendar',
  description: '國定假日、紀念日與自訂節日設定，影響排班與加班計算。',
};

const mockHolidays = [
  { date: '2026-01-01', name: '元旦', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-02-10', name: '春節（初一）', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-02-11', name: '春節（初二）', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-02-12', name: '春節（初三）', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-02-13', name: '春節（初四）', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-04-04', name: '清明節', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-04-05', name: '兒童節', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-05-01', name: '勞動節', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-06-20', name: '端午節', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
  { date: '2026-09-28', name: '中秋節', type: '國定假日', color: 'bg-red-50 border-red-200 text-red-700' },
];

export default function HolidaysPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎌</span>
          <span className="font-bold text-xl text-indigo-700">節日設定</span>
        </div>
        <div className="flex gap-3">
          <Link href="/data/staff" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            員工資料
          </Link>
          <Link href="/data/shifts" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            班別資料
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-600">共 {mockHolidays.length} 個節日（2026 年度）</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + 新增節日
          </button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['日期', '名稱', '類型'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockHolidays.map((h, i) => (
                <tr key={h.date} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{h.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{h.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${h.color}`}>
                      {h.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-3">💡 節日與排班</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• 國定假日自動標記為高加班需求日。</li>
            <li>• 節日當日排班時，系統優先建議 OC（加班）班別。</li>
            <li>• 自訂節日（如公司創立日）可由管理者自行新增。</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📅 返回月曆
          </Link>
          <Link href="/reports" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📊 出勤報表
          </Link>
        </div>
      </div>
    </div>
  );
}
