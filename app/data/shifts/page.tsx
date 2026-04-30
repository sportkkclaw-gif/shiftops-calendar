import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '班別資料 — ShiftOps Calendar',
  description: '班別（Shift Type）設定：早班、午班、大夜班、休息等。',
};

const mockShifts = [
  { code: 'A', name: '早班', time: '08:00–16:00', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { code: 'B', name: '午班', time: '16:00–24:00', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  { code: 'N', name: '大夜班', time: '00:00–08:00', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { code: 'OFF', name: '休息', time: '—', color: 'bg-slate-200 border-slate-300 text-slate-600' },
  { code: 'OC', name: '加班', time: '額外', color: 'bg-amber-100 border-amber-300 text-amber-800' },
];

export default function ShiftsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗂️</span>
          <span className="font-bold text-xl text-indigo-700">班別資料</span>
        </div>
        <div className="flex gap-3">
          <Link href="/data/staff" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            員工資料
          </Link>
          <Link href="/data/holidays" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            節日設定
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-600">共 {mockShifts.length} 種班別</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + 新增班別
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {mockShifts.map((s) => (
            <div key={s.code} className={`border rounded-xl p-5 ${s.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold">{s.code}</span>
                <span className="text-xs px-2 py-0.5 rounded border opacity-75">{s.time}</span>
              </div>
              <div className="font-semibold mb-1">{s.name}</div>
              <div className="flex gap-2 mt-3">
                <button className="text-xs opacity-75 hover:opacity-100 font-medium underline">編輯</button>
                <button className="text-xs opacity-75 hover:opacity-100 font-medium underline">刪除</button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-3">💡 班別使用說明</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• A / B 為基本班別，支援做三休一、A/B 輪替等策略。</li>
            <li>• N（大夜班）預設 00:00–08:00，自動標記為高疲勞指數。</li>
            <li>• OFF 表示該日無排班，不計入正常工時。</li>
            <li>• OC（加班）為超時額外班別，會產生 OvertimeCandidate 記錄。</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📅 返回月曆
          </Link>
          <Link href="/data/holidays" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            🎌 節日設定
          </Link>
        </div>
      </div>
    </div>
  );
}
