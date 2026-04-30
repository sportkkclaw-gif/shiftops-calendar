import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '員工資料 — ShiftOps Calendar',
  description: '員工名冊管理、班別資訊與出勤資料。',
};

const mockStaff = [
  { id: 1, name: '王小明', role: '資深護理師', department: '內科', status: '在職' },
  { id: 2, name: '李小華', role: '護理師', department: '外科', status: '在職' },
  { id: 3, name: '陳大山', role: '護理師', department: '急診', status: '在職' },
  { id: 4, name: '林小美', role: '行政助理', department: '管理部', status: '在職' },
  { id: 5, name: '張阿傑', role: '藥師', department: '藥劑科', status: '留停' },
];

export default function StaffPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <span className="font-bold text-xl text-indigo-700">員工資料</span>
        </div>
        <div className="flex gap-3">
          <Link href="/data/shifts" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            班別資料
          </Link>
          <Link href="/data/holidays" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            節日設定
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-600">共 {mockStaff.length} 名員工</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + 新增員工
          </button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['姓名', '角色', '部門', '狀態', '操作'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockStaff.map((s, i) => (
                <tr key={s.id} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.role}</td>
                  <td className="px-4 py-3 text-slate-600">{s.department}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === '在職' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">編輯</button>
                    <button className="text-slate-500 hover:text-slate-700 text-xs">檢視</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📅 查看月曆排班
          </Link>
          <Link href="/reports" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📊 出勤報表
          </Link>
        </div>
      </div>
    </div>
  );
}
