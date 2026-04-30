'use client'

import { useState, useEffect } from 'react'

interface PatternSeed {
  id: string
  name: string
  patternType: string
  description: string
  phaseOffset: number
  shiftGroupOffset: number
  cycleDays: number
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<PatternSeed[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PatternSeed | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local edit state for offset fields
  const [phaseOffset, setPhaseOffset] = useState(0)
  const [shiftGroupOffset, setShiftGroupOffset] = useState(0)
  const [cycleDays, setCycleDays] = useState(7)

  useEffect(() => {
    fetch('/api/schedule/named-patterns')
      .then((r) => {
        if (!r.ok) throw new Error(`載入失敗 (${r.status})`)
        return r.json()
      })
      .then((json) => {
        setPatterns(json.data ?? [])
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '載入模式資料失敗')
        setLoading(false)
      })
  }, [])

  function selectPattern(p: PatternSeed) {
    setSelected(p)
    setPhaseOffset(p.phaseOffset)
    setShiftGroupOffset(p.shiftGroupOffset)
    setCycleDays(p.cycleDays)
    setSaved(false)
    setError(null)
  }

  async function saveOffsets() {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/schedule/named-patterns/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseOffset, shiftGroupOffset, cycleDays }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Save failed')
      const serverData = json.data
      setSelected((prev) => prev ? { ...prev, phaseOffset: serverData.phaseOffset, shiftGroupOffset: serverData.shiftGroupOffset, cycleDays: serverData.cycleDays } : null)
      setPatterns((prev) =>
        prev.map((p) => p.id === selected.id ? { ...p, phaseOffset: serverData.phaseOffset, shiftGroupOffset: serverData.shiftGroupOffset, cycleDays: serverData.cycleDays } : p)
      )
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔄</span>
          <span className="font-bold text-xl text-indigo-700">班表模式設定</span>
        </div>
        <div className="flex gap-3">
          <a href="/data/shifts" className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            班別資料
          </a>
          <a href="/calendar" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            返回月曆
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">🌙 班表模式設定</h1>
          <p className="text-sm text-slate-600">
            調整各班表模式的相位偏移、組別偏移與週期天數。
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">載入中…</div>
        ) : (
          <div className="grid grid-cols-5 gap-6">
            {/* Pattern list */}
            <div className="col-span-2 bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">可用模式</p>
              </div>
              <ul className="divide-y">
                {patterns.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => selectPattern(p)}
                      className={`w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors ${
                        selected?.id === p.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                      }`}
                    >
                      <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                    </button>
                  </li>
                ))}
                {patterns.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-slate-400">尚無模式資料</li>
                )}
              </ul>
            </div>

            {/* Offset editor */}
            <div className="col-span-3 bg-white border rounded-xl p-6">
              {selected ? (
                <div>
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
                    <p className="text-sm text-slate-500">{selected.description}</p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        相位偏移 (phaseOffset)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={phaseOffset}
                        onChange={(e) => setPhaseOffset(Number(e.target.value))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">範圍 0–6，決定輪班相位起始位置</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        組別偏移 (shiftGroupOffset)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={shiftGroupOffset}
                        onChange={(e) => setShiftGroupOffset(Number(e.target.value))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">範圍 0–6，決定哪個組別取得哪個班別</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        週期天數 (cycleDays)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={cycleDays}
                        onChange={(e) => setCycleDays(Number(e.target.value))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">範圍 1–31，完整輪班的總天數</p>
                    </div>

                    {error && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                      </div>
                    )}

                    {saved && (
                      <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        ✓ 已儲存變更
                      </div>
                    )}

                    <button
                      onClick={saveOffsets}
                      disabled={saving}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? '儲存中…' : '儲存變更'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  ← 請先選擇左側的模式
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
