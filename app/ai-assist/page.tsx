import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 排班助手 — ShiftOps Calendar',
  description: 'AI-first 智慧排班助理，支援自然語言驅動、做三休一、A/B 輪替等排班規則。',
};

export default function AIAssistPage() {
  const features = [
    {
      icon: '🤖',
      title: '自然語言驅動',
      desc: '輸入「做三休一、台北總部、2026年4月」，AI 自動計算並產生班表預演。',
      href: '/calendar?panel=ai',
      cta: '開啟 AI 助手',
    },
    {
      icon: '🔄',
      title: 'AI 復原（Rollback）',
      desc: '以 RuleApplyRun 為單位，一鍵回復至任意歷史版本，保障資料安全。',
      href: '/api/ai/apply-runs/demo/rollback',
      cta: '查看復原 API',
    },
    {
      icon: '📊',
      title: '排班預演（Preview）',
      desc: '在正式套用前，先以 Token 形式預覽完整排班結果，確認後再執行。',
      href: '/calendar?panel=ai',
      cta: '產生預演',
    },
    {
      icon: '🌙',
      title: 'Mock AI 模式',
      desc: '無外部 API Key 時，系統使用 deterministic mock 模式，完全脫機運作。',
      href: '/calendar',
      cta: '了解 Mock 模式',
    },
  ];

  const presets = [
    '做三休一', '做四休四', 'A/B 輪替', '2-2-3 制度', '週末補人',
    '大夜班固定', '責任制輪替', '跨區派遣',
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-bold text-xl text-indigo-700">AI 排班助手</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            月曆
          </Link>
          <Link href="/calendar?panel=ai" className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
            AI 面板
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            <span className="text-indigo-600">AI-First</span> 智慧排班助理
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            告別繁瑣的手動排班。只需描述需求，AI 在幾秒鐘內為你計算最優班表，
            並支援預演確認、滾動復原，確保每一次排班都精準無誤。
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          {features.map((f) => (
            <div key={f.title} className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{f.desc}</p>
              <Link
                href={f.href}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700"
              >
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>

        {/* Quick presets */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">⚡ 快速開始 — 常用排班模板</h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Link
                key={p}
                href={`/calendar?panel=ai&preset=${encodeURIComponent(p)}`}
                className="px-4 py-2 border border-slate-200 rounded-full text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                {p}
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <Link
              href="/calendar?panel=ai"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <span>▶</span> 開啟 AI 排班面板
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
