'use client'
import Link from 'next/link';

export default function SharePrintPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🖨️</span>
          <span className="font-bold text-xl text-indigo-700">分享與列印</span>
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

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">🖨️ 分享與列印</h1>
          <p className="text-slate-600">將月曆分享給同事，或使用瀏覽器列印功能輸出為 PDF。</p>
        </div>

        {/* Share link */}
        <div className="bg-white border rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">🔗 分享連結</h2>
          <p className="text-sm text-slate-600 mb-4">
            複製以下連結，分享給團隊成員。收到連結的人無需登入即可查看（唯讀）。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://shiftops.local'}/calendar`}
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://shiftops.local'}/calendar`);
                alert('連結已複製！');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              複製
            </button>
          </div>
        </div>

        {/* Print options */}
        <div className="bg-white border rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">🖨️ 列印選項</h2>
          <p className="text-sm text-slate-600 mb-4">
            使用瀏覽器列印功能（Ctrl+P / Cmd+P）可將月曆儲存為 PDF。建議使用 Chrome 以獲得最佳 PDF 輸出效果。
          </p>
          <div className="space-y-3">
            {[
              { label: '顯示員工姓名', checked: true },
              { label: '顯示班別顏色標記', checked: true },
              { label: '顯示缺口與衝突 Badge', checked: true },
              { label: '黑白列印模式', checked: false },
            ].map(({ label, checked }) => (
              <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" defaultChecked={checked} className="rounded border-slate-300" />
                {label}
              </label>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            🖨️ 開啟列印對話框
          </button>
        </div>

        {/* Export via /export */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 mb-4">📤 專業匯出（PDF / PNG）</h2>
          <p className="text-sm text-slate-600 mb-4">
            如需高解析度月曆圖檔或完整 PDF（含頁首頁尾），建議使用匯出中心。
          </p>
          <Link
            href="/export"
            className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            前往匯出中心 →
          </Link>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/export" className="flex-1 text-center px-4 py-3 bg-white border rounded-xl text-sm hover:shadow-md transition-shadow">
            📤 匯出中心
          </Link>
          <Link href="/calendar" className="flex-1 text-center px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            📅 返回月曆
          </Link>
        </div>
      </div>
    </div>
  );
}
