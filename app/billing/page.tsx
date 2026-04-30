import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '帳單與訂閱 — ShiftOps Calendar',
  description: '查看方案用量、帳單記錄與訂閱狀態。',
};

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💳</span>
          <span className="font-bold text-xl text-indigo-700">帳單與訂閱</span>
        </div>
        <div className="flex gap-3">
          <Link href="/settings" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            系統設定
          </Link>
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">💳 帳單與訂閱</h1>
          <p className="text-slate-600">查看目前方案、用量統計與過往帳單。</p>
        </div>

        {/* Current plan */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-indigo-800">Pro 方案</h2>
              <p className="text-sm text-indigo-600">組織：Demo Org（示範模式）</p>
            </div>
            <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm font-medium">使用中</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '員工名額', value: '20 / 50 人' },
              { label: '本月已匯出', value: '8 / 100 次' },
              { label: 'API 呼び用', value: '142 / 5000 次' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-indigo-100 rounded-lg p-3 text-center">
                <div className="text-xs text-indigo-500 mb-1">{s.label}</div>
                <div className="font-semibold text-indigo-800">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: '👥', label: '員工', value: '20' },
            { icon: '📅', label: '月排班', value: '12' },
            { icon: '🔄', label: '調班申請', value: '34' },
            { icon: '📤', label: '匯出任務', value: '8' },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Billing history */}
        <div className="bg-white border rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-slate-800">📋 帳單記錄</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['日期', '項目', '金額', '狀態'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { date: '2026-04-01', item: 'Pro 月費（4月）', amount: 'NT$ 2,000', status: '已繳費', color: 'bg-emerald-100 text-emerald-700' },
                { date: '2026-03-01', item: 'Pro 月費（3月）', amount: 'NT$ 2,000', status: '已繳費', color: 'bg-emerald-100 text-emerald-700' },
                { date: '2026-02-01', item: 'Pro 月費（2月）', amount: 'NT$ 2,000', status: '已繳費', color: 'bg-emerald-100 text-emerald-700' },
              ].map((row, i) => (
                <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-6 py-3 text-slate-500">{row.date}</td>
                  <td className="px-6 py-3 text-slate-800">{row.item}</td>
                  <td className="px-6 py-3 font-medium text-slate-800">{row.amount}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.color}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <Link href="/settings" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            ⚙️ 系統設定
          </Link>
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            📅 返回月曆
          </Link>
        </div>
      </div>
    </div>
  );
}
