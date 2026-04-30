import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '更多功能 — ShiftOps Calendar',
  description: '探索更多 ShiftOps 功能：分享列印、API 文件、組織管理等。',
};

const moreLinks = [
  {
    icon: '🖨️',
    title: '分享與列印',
    href: '/share-print',
    desc: '將月曆分享給同事或列印為 PDF。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '📊',
    title: '出勤報表',
    href: '/reports',
    desc: '員工出勤統計、加班時數、缺口分析。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '📤',
    title: '匯出中心',
    href: '/export',
    desc: 'PDF / PNG / ICS 非同步匯出任務管理。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '⚙️',
    title: '系統設定',
    href: '/settings',
    desc: '顯示偏好、加班規則、通知設定。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '💳',
    title: '帳單與訂閱',
    href: '/billing',
    desc: '方案用量、帳單記錄與訂閱狀態。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '🔍',
    title: '審計日誌',
    href: '/audit',
    desc: '系統操作審計日誌、AI 操作與匯出記錄。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '🤖',
    title: 'AI 助手',
    href: '/ai-assist',
    desc: '自然語言驅動排班、AI 預演與復原。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '👥',
    title: '員工資料',
    href: '/data/staff',
    desc: '員工名冊、角色與部門管理。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '🗂️',
    title: '班別資料',
    href: '/data/shifts',
    desc: '班別設定：早班、午班、大夜班、休息。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '🎌',
    title: '節日設定',
    href: '/data/holidays',
    desc: '國定假日與自訂節日管理。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '🔄',
    title: '調班管理',
    href: '/swap-requests',
    desc: '調班申請、審核與歷史記錄。',
    color: 'bg-slate-50 border-slate-200',
  },
  {
    icon: '📅',
    title: '月曆主頁',
    href: '/calendar',
    desc: '返回月曆主視圖，查看完整排班。',
    color: 'bg-indigo-50 border-indigo-200',
  },
];

export default function MorePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">☰</span>
          <span className="font-bold text-xl text-indigo-700">更多功能</span>
        </div>
        <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          返回月曆
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">☰ 更多功能</h1>
          <p className="text-slate-600">探索 ShiftOps 所有功能模組，快速導航至目標頁面。</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {moreLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`border rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all ${link.color}`}
            >
              <div className="text-3xl mb-3">{link.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-1">{link.title}</h3>
              <p className="text-sm text-slate-500">{link.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            🏠 返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
