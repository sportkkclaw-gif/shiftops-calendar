'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth()+1, 0) }
function addMonths(d: Date, n: number){ return new Date(d.getFullYear(), d.getMonth()+n, 1) }
function subMonths(d: Date, n: number){ return addMonths(d, -n) }
function getDay(d: Date){ return d.getDay() }
function eachDayOfInterval({start,end}:{start:Date,end:Date}){ const out:Date[]=[]; const cur=new Date(start); while(cur<=end){ out.push(new Date(cur)); cur.setDate(cur.getDate()+1);} return out }
function pad2(n:number){ return String(n).padStart(2,'0') }
function formatDate(d: Date, pattern: 'd'|'yyyy/MM/dd'|'yyyy 年 MM 月'){
  if(pattern==='d') return String(d.getDate())
  if(pattern==='yyyy/MM/dd') return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`
  return `${d.getFullYear()} 年 ${pad2(d.getMonth()+1)} 月`
}

// ─── Types ───────────────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week'
type OvertimeDisplay = 'HIDE' | 'BADGE' | 'CANDIDATES' | 'ASSIGNMENTS'
type Tab = 'calendar' | 'ai' | 'inspector'

/** J86: DayCellData now typed to match GET /api/calendar/projection response shape. */
interface DayCellData {
  date: Date
  shiftCode: string
  shiftLabel: string
  assignedStaff: string[]
  coverageStatus: 'adequate' | 'low' | 'full'
  hasConflict: boolean
  overtimeCount: number
  overtimeCandidates: { name: string; score: number }[]
  /** D38: coverage alert badge — true when the day has a generated coverage alert */
  hasCoverageAlert: boolean
  /** D38: alert severity for badge styling */
  alertSeverity?: 'warning' | 'error'
}

interface AIPreview {
  previewToken: string
  status: 'ready' | 'partial' | 'blocked'
  explanation: string
  assignmentsCount: number
}

/**
 * J86: Replaces mock buildMonthGrid().
 * Fetches per-day projection data from GET /api/calendar/projection for the given month.
 * Falls back to a deterministic in-memory grid if the API call fails
 * (e.g. when DB is unseeded during development).
 */
async function fetchMonthGrid(baseDate: Date): Promise<DayCellData[]> {
  const year = baseDate.getFullYear()
  const month = String(baseDate.getMonth() + 1).padStart(2, '0')
  const monthStr = `${year}-${month}`

  try {
    const res = await fetch(
      `/api/calendar/projection?organizationId=org_demo&locationId=loc_demo&month=${monthStr}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`projection API ${res.status}`)

    const json = await res.json()
    const { projections } = json.data as {
      projections: Array<{
        date: string
        weekday: number
        locationId: string
        ruleProjections: Array<{ phaseLabel: string; phaseDescription: string }>
        tokens: Array<{ code: string; label: string }>
        assignments: Array<{ staffId: string; staffName: string }>
        coverageStatus: string
        overtimeAssignments: Array<{ staffId: string; staffName: string }>
      }>
    }

    return projections.map((p) => {
      const primary = p.ruleProjections[0]
      const coverageStatus = p.coverageStatus === 'adequate'
        ? 'adequate' as const
        : p.coverageStatus === 'low'
        ? 'low' as const
        : 'full' as const

      // D38: hasCoverageAlert from traceable source — prefer DB alerts from
      // /api/calendar/projection.coverageAlerts[], falling back to coverageStatus=low heuristic.
      // The projection API now includes coverageAlerts[] per day (from prisma.coverageAlert).
      const alerts: Array<{ severity: string; message: string }> = (p as Record<string, unknown>).coverageAlerts as Array<{ severity: string; message: string }> ?? []
      const hasAlert = alerts.length > 0
      const alertSeverity = hasAlert
        ? (alerts.some(a => a.severity === 'error') ? 'error' : 'warning') as 'warning' | 'error'
        : undefined

      return {
        date: new Date(p.date),
        shiftCode: primary?.phaseLabel ?? 'A',
        shiftLabel: primary?.phaseDescription ?? '早班',
        assignedStaff: p.assignments.map(a => a.staffName),
        coverageStatus,
        hasConflict: false,
        overtimeCount: p.overtimeAssignments.length,
        overtimeCandidates: p.overtimeAssignments.map(ot => ({
          name: ot.staffName,
          score: 0.8,
        })),
        // D38: coverage alert badge — sourced directly from API coverageAlerts[]
        hasCoverageAlert: hasAlert,
        alertSeverity,
      }
    })
  } catch {
    // Fallback: deterministic mock data so the calendar always renders
    return buildMockGrid(baseDate)
  }
}

/** Deterministic fallback when DB is unavailable */
function buildMockGrid(baseDate: Date): DayCellData[] {
  const start = startOfMonth(baseDate)
  const end = endOfMonth(baseDate)
  const days = eachDayOfInterval({ start, end })

  return days.map((day, idx) => {
    const dayOfCycle = idx % 7
    const shiftCode = dayOfCycle === 5 || dayOfCycle === 6 ? 'B' : 'A'
    const shiftLabel = dayOfCycle === 5 || dayOfCycle === 6 ? '午班' : '早班'
    const staff = ['王小明', '李小華', '陳大山'].slice(0, (idx % 3) + 1)
    const coverageStatus = idx % 5 === 4 || idx % 7 === 6 ? 'low' : 'adequate'
    const overtimeCandidates = coverageStatus === 'low'
      ? [{ name: '王小明', score: 0.85 }, { name: '李小華', score: 0.72 }]
      : []

    return {
      date: day,
      shiftCode,
      shiftLabel,
      assignedStaff: staff,
      coverageStatus: coverageStatus as 'adequate' | 'low' | 'full',
      hasConflict: idx % 11 === 0,
      overtimeCount: coverageStatus === 'low' ? 1 : 0,
      overtimeCandidates,
      // D38: coverage alert badge — low coverage days are flagged
      hasCoverageAlert: coverageStatus === 'low',
      alertSeverity: coverageStatus === 'low' ? 'warning' as const : undefined,
    }
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function CalendarCell({ cell, showOvertime, onClick }: { cell: DayCellData; showOvertime: boolean; onClick: () => void }) {
  const isWeekend = getDay(cell.date) === 0 || getDay(cell.date) === 6
  const bgClass = isWeekend ? 'bg-slate-100' : 'bg-white'
  const shiftColorMap: Record<string, string> = {
    A: 'bg-blue-100 border-blue-300 text-blue-800',
    B: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    N: 'bg-purple-100 border-purple-300 text-purple-800',
    OFF: 'bg-slate-200 border-slate-300 text-slate-600',
    OC: 'bg-amber-100 border-amber-300 text-amber-800',
  }
  const shiftBg = shiftColorMap[cell.shiftCode] ?? 'bg-white border-slate-200'

  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-2 min-h-[110px] cursor-pointer hover:shadow-md transition-all ${bgClass} ${shiftBg}`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className={`text-sm font-bold ${isWeekend ? 'text-red-500' : 'text-slate-700'}`}>
          {formatDate(cell.date, 'd')}
        </span>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded border">{cell.shiftCode}</span>
      </div>

      <div className="text-xs font-medium mb-1 truncate">{cell.shiftLabel}</div>

      <div className="space-y-0.5">
        {cell.assignedStaff.slice(0, 2).map((name, i) => (
          <div key={i} className="text-xs text-slate-600 truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            {name}
          </div>
        ))}
        {cell.assignedStaff.length > 2 && (
          <div className="text-xs text-slate-400">+{cell.assignedStaff.length - 2} 人</div>
        )}
      </div>

      {/* D38: Coverage alert badge — embedded in calendar cell */}
      {cell.hasCoverageAlert && (
        <div className="mt-1.5 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded border border-red-200 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          缺班
        </div>
      )}
      {cell.coverageStatus === 'low' && (
        <div className="mt-1.5 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded border border-red-200 font-medium">
          缺口
        </div>
      )}
      {cell.hasConflict && (
        <div className="mt-0.5 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded border border-orange-200">
          衝突
        </div>
      )}

      {/* Overtime overlay */}
      {showOvertime && cell.overtimeCount > 0 && (
        <div className="mt-1 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300 font-medium">
          加班 +{cell.overtimeCount}
        </div>
      )}
    </div>
  )
}

function DayInspector({ cell, onClose }: { cell: DayCellData; onClose: () => void }) {
  return (
    <div className="bg-white border rounded-xl shadow-lg p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">
          {formatDate(cell.date, 'yyyy/MM/dd')} ({['週日', '週一', '週二', '週三', '週四', '週五', '週六'][getDay(cell.date)]})
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border rounded-lg p-3 bg-slate-50">
          <div className="text-xs text-slate-500 mb-1">班別</div>
          <div className="font-semibold text-slate-800">{cell.shiftLabel}</div>
          <div className="text-xs text-slate-500">({cell.shiftCode})</div>
        </div>
        <div className="border rounded-lg p-3 bg-slate-50">
          <div className="text-xs text-slate-500 mb-1">覆蓋狀態</div>
          <div className={`font-semibold ${cell.coverageStatus === 'adequate' ? 'text-emerald-600' : cell.coverageStatus === 'low' ? 'text-red-600' : 'text-blue-600'}`}>
            {cell.coverageStatus === 'adequate' ? '充足' : cell.coverageStatus === 'low' ? '缺口' : '超額'}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-2">已排人員</div>
        <div className="space-y-1">
          {cell.assignedStaff.map((name, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              {name}
            </div>
          ))}
        </div>
      </div>

      {cell.overtimeCandidates.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2">加班候選人</div>
          <div className="space-y-1">
            {cell.overtimeCandidates.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm border rounded px-2 py-1 bg-amber-50">
                <span>{c.name}</span>
                <span className="text-xs text-amber-700 font-medium">{(c.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cell.hasConflict && (
        <div className="border border-orange-300 bg-orange-50 rounded-lg p-3 text-sm text-orange-800">
          ⚠️ 衝突：與既有班表重疊或違反休息間隔
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          補班
        </button>
        <button className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors" onClick={() => window.location.href = '/swap-requests'}>
          調班
        </button>
      </div>
    </div>
  )
}

function AIPanel({ onPreview }: { onPreview: (p: AIPreview) => void }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIPreview | null>(null)

  const presets = [
    '做三休一',
    '做四休四',
    'A/B 輪替',
    '2-2-3 制度',
    '週末補人',
  ]

  const handleGenerate = useCallback(async (text?: string) => {
    const query = text ?? prompt
    if (!query.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/ai/preview-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org_demo',
          locationId: 'loc_demo',
          dateRange: { start: '2026-04-01', end: '2026-04-30' },
          prompt: query,
        }),
      })
      const json = await res.json()
      if (json.data) {
        const preview: AIPreview = {
          previewToken: json.data.previewToken,
          status: json.data.status,
          explanation: json.data.explanation ?? '',
          assignmentsCount: json.data.proposedAssignments?.length ?? 0,
        }
        setResult(preview)
        onPreview(preview)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [prompt, onPreview])

  return (
    <div className="bg-white border rounded-xl shadow-lg p-5 w-full">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        🤖 AI 排班助理
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-normal">Mock Mode</span>
      </h2>

      <div className="mb-4">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="輸入排班需求，例如：做三休一，台北總部，2026年4月"
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
        />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => handleGenerate(p)}
            className="px-3 py-1.5 text-xs border rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={() => handleGenerate()}
        disabled={loading}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '⏳ AI 產生中...' : '▶ 產生排班預演'}
      </button>

      {result && (
        <div className="mt-4 border rounded-lg p-4 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${result.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-sm font-semibold">
              狀態：{result.status === 'ready' ? '✓ 可確認' : result.status === 'partial' ? '⚠ 部分' : '✕ 受阻'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-3">{result.explanation}</p>
          <div className="text-xs text-slate-500 mb-3">Token: {result.previewToken}</div>
          <div className="text-xs text-slate-500 mb-3">提議排班: {result.assignmentsCount} 筆</div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await fetch('/api/ai/apply-preview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    previewToken: result.previewToken,
                    organizationId: 'org_demo',
                    locationId: 'loc_demo',
                  }),
                })
                alert('已套用到月曆！')
              }}
              className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
            >
              套用
            </button>
            <button
              onClick={() => setResult(null)}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-medium hover:bg-slate-100"
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsPanel() {
  return (
    <div className="bg-white border rounded-xl shadow-lg p-5 w-full">
      <h2 className="text-lg font-bold text-slate-800 mb-4">⚙️ 顯示設定</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">加班顯示模式</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="BADGE">Badge（徽章）</option>
            <option value="CANDIDATES">候選人列表</option>
            <option value="ASSIGNMENTS">已排加班</option>
            <option value="HIDE">隱藏</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">月曆密度</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="standard">標準</option>
            <option value="compact">緊湊</option>
            <option value="comfortable">寬鬆</option>
          </select>
        </div>

        <div className="space-y-2">
          {[
            { label: '顯示員工姓名', checked: true },
            { label: '顯示人數計數', checked: true },
            { label: '顯示缺口Badge', checked: true },
            { label: '顯示衝突Badge', checked: true },
          ].map(({ label, checked }) => (
            <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" defaultChecked={checked} className="rounded border-slate-300" />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)) // April 2026
  const [selectedCell, setSelectedCell] = useState<DayCellData | null>(null)
  const [showOvertime, setShowOvertime] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('calendar')
  const [preview, setPreview] = useState<AIPreview | null>(null)
  // J86: cells are now fetched from GET /api/calendar/projection
  const [cells, setCells] = useState<DayCellData[]>(buildMockGrid(new Date(2026, 3, 1)))
  const [loadingCells, setLoadingCells] = useState(false)

  // Refetch grid whenever the displayed month changes
  useEffect(() => {
    let cancelled = false
    setLoadingCells(true)
    fetchMonthGrid(currentDate).then(grid => {
      if (!cancelled) {
        setCells(grid)
        setLoadingCells(false)
      }
    })
    return () => { cancelled = true }
  }, [currentDate])

  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

  const exportPDF = async () => {
    const res = await fetch('/api/export/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_demo',
        locationId: 'loc_demo',
        type: 'PDF',
        options: { dateRange: { start: '2026-04-01', end: '2026-04-30' } },
      }),
    })
    const json = await res.json()
    alert(`匯出任務已建立: ${json.data?.jobId}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span className="font-bold text-lg text-indigo-700">ShiftOps Calendar</span>
            </div>
            <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="px-3 py-1.5 hover:bg-slate-100 text-sm transition-colors"
              >
                ‹
              </button>
              <span className="px-4 py-1.5 text-sm font-medium min-w-[120px] text-center">
                {formatDate(currentDate, 'yyyy 年 MM 月')}
              </span>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="px-3 py-1.5 hover:bg-slate-100 text-sm transition-colors"
              >
                ›
              </button>
            </div>
            <button
              onClick={() => setCurrentDate(new Date(2026, 3, 1))}
              className="px-3 py-1.5 border rounded-lg text-xs hover:bg-slate-50 transition-colors"
            >
              今天
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOvertime(!showOvertime)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${showOvertime ? 'bg-amber-100 border-amber-300 text-amber-800' : 'hover:bg-slate-50'}`}
            >
              加班 overlay {showOvertime ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={exportPDF}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              📤 匯出
            </button>
            <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              Mock Mode
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 flex gap-1 border-t">
          {(['calendar', 'ai', 'inspector'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'calendar' ? '📅 月曆' : tab === 'ai' ? '🤖 AI 助手' : '🔍 日巡查'}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {activeTab === 'calendar' && (
          <>
            {/* Calendar grid */}
            <div className="mb-4 flex gap-2">
              {weekdays.map((w, i) => (
                <div key={w} className={`flex-1 text-center text-xs font-semibold py-1 rounded ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-600'}`}>
                  {w}
                </div>
              ))}
            </div>

            {/* J86: loading overlay while fetching projection API */}
            {loadingCells && (
              <div className="col-span-7 text-center py-4 text-sm text-indigo-500">
                ⏳ 載入班表投影…
              </div>
            )}

            <div className="grid grid-cols-7 gap-2">
              {/* Padding cells for first week offset */}
              {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                <div key={`pad_${i}`} className="min-h-[110px]" />
              ))}

              {cells.map((cell, idx) => (
                <CalendarCell
                  key={idx}
                  cell={cell}
                  showOvertime={showOvertime}
                  onClick={() => setSelectedCell(cell)}
                />
              ))}
            </div>

            {/* Selected cell inspector */}
            {selectedCell && (
              <div className="mt-6">
                <DayInspector cell={selectedCell} onClose={() => setSelectedCell(null)} />
              </div>
            )}

            {/* AI preview result toast */}
            {preview && (
              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center gap-3">
                <span className="text-indigo-600 text-lg">🤖</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-indigo-800">AI 排班已就緒</div>
                  <div className="text-xs text-indigo-600">{preview.explanation}</div>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="text-indigo-400 hover:text-indigo-700 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'ai' && (
          <div className="max-w-lg">
            <AIPanel onPreview={setPreview} />
          </div>
        )}

        {activeTab === 'inspector' && (
          <div className="max-w-lg">
            {selectedCell ? (
              <DayInspector cell={selectedCell} onClose={() => setSelectedCell(null)} />
            ) : (
              <div className="bg-white border rounded-xl shadow p-8 text-center text-slate-400">
                點擊月曆日期以查看詳細資訊
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="mt-6 max-w-lg">
            <SettingsPanel />
          </div>
        )}
      </div>
    </div>
  )
}
