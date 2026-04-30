import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '系統設定 — ShiftOps Calendar',
  description: '顯示設定、組織設定、加班規則與通知偏好。',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <span className="font-bold text-xl text-indigo-700">系統設定</span>
        </div>
        <div className="flex gap-3">
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">⚙️ 系統設定</h1>
          <p className="text-slate-600">管理顯示偏好、加班規則、組織資訊與通知設定。</p>
        </div>

        <div className="space-y-6">
          {/* Display settings */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-slate-800 mb-4">🖥️ 顯示設定</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">月曆密度</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="standard">標準</option>
                  <option value="compact">緊湊</option>
                  <option value="comfortable">寬鬆</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">加班顯示模式</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="BADGE">Badge（徽章）</option>
                  <option value="CANDIDATES">候選人列表</option>
                  <option value="ASSIGNMENTS">已排加班</option>
                  <option value="HIDE">隱藏</option>
                </select>
              </div>
              {[
                { label: '顯示員工姓名', checked: true },
                { label: '顯示人數計數', checked: true },
                { label: '顯示缺口 Badge', checked: true },
                { label: '顯示衝突 Badge', checked: true },
              ].map(({ label, checked }) => (
                <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" defaultChecked={checked} className="rounded border-slate-300" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Overtime rules */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-slate-800 mb-4">⏰ 加班規則</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">每月加班上限（小時）</label>
                <input
                  type="number"
                  defaultValue={46}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">單日最大工時（小時）</label>
                <input
                  type="number"
                  defaultValue={12}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="autoOvertime" className="rounded border-slate-300" />
                <label htmlFor="autoOvertime" className="text-sm">自動產生加班候選人（OvertimeCandidate）</label>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-slate-800 mb-4">🔔 通知設定</h2>
            <div className="space-y-3">
              {[
                { label: '班表缺口時發送提醒', checked: true },
                { label: '調班申請有新回覆時通知', checked: true },
                { label: '匯出任務完成後通知', checked: false },
                { label: 'AI 排班預演已就緒時通知', checked: true },
              ].map(({ label, checked }) => (
                <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" defaultChecked={checked} className="rounded border-slate-300" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            儲存設定
          </button>
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📅 返回月曆
          </Link>
          <Link href="/more" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            更多功能
          </Link>
        </div>
      </div>
    </div>
  );
}
