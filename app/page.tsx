import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <span className="font-bold text-xl text-indigo-700">ShiftOps Calendar</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            月曆
          </Link>
          <Link href="/calendar?panel=ai" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
            AI 助手
          </Link>
          <Link href="/calendar?panel=settings" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
            設定
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 px-6 py-20 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6 tracking-tight text-slate-900">
          <span className="text-indigo-600">AI-First</span> 智慧排班系統
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          班表中樞 ShiftOps Calendar — 自然語言驅動排班、月曆視圖、AI 預演 / 確認 / 復原、加班 overlay、匯出中心。
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/calendar" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            開啟月曆
          </Link>
          <Link href="/calendar?panel=ai" className="px-6 py-3 border border-slate-300 bg-white rounded-lg font-medium hover:bg-slate-50 transition-colors">
            AI 排班
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t bg-white px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8">
          {[
            { icon: '📅', title: '月曆視圖', desc: '月曆 cell、班別投影、缺口 badge、加班 overlay 開關' },
            { icon: '🤖', title: 'AI 排班預演', desc: '自然語言驅動，支援做三休一、A/B 輪替、命名制度' },
            { icon: '🔄', title: 'AI 復原', desc: '以 RuleApplyRun 為單位的 rollback 機制' },
            { icon: '📤', title: '匯出任務', desc: 'PDF / PNG / ICS 非同步匯出 job 狀態機' },
            { icon: '⏰', title: '加班候選', desc: 'OvertimeCandidate 產生、分數與風險旗標' },
            { icon: '🌙', title: 'Mock AI', desc: '無外部 API Key 時 deterministic mock 模式' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="border rounded-xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-3">{icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t px-6 py-8 text-center text-sm text-slate-500">
        ShiftOps Calendar — Mock Mode: {process.env.MOCK_AI ?? 'true'} | Next.js + Prisma
      </footer>
    </div>
  );
}
