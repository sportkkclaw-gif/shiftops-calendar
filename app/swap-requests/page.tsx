'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SwapRequest {
  id: string
  requesterId: string
  requesterName: string
  targetDate: string
  targetShiftTypeId: string
  desiredPartnerId?: string
  desiredPartnerName?: string
  status: string
  aiSuggestions?: string
  managerId?: string
  managerComment?: string
  approvedAt?: string
  createdAt: string
}

interface Staff {
  id: string
  name: string
}

interface ShiftType {
  id: string
  label: string
  code: string
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.split(';').find(c => c.trim().startsWith(`${name}=`))
  return match ? match.trim().split('=')[1] : undefined
}

export default function SwapRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('MEMBER')
  const [token, setToken] = useState<string>('')

  // Form state
  const [staff, setStaff] = useState<Staff[]>([
    { id: 'staff_1', name: '王小明' },
    { id: 'staff_2', name: '李小華' },
    { id: 'staff_3', name: '陳大山' },
  ])
  const [shiftTypes] = useState<ShiftType[]>([
    { id: 'st_morning', label: '早班', code: 'A' },
    { id: 'st_afternoon', label: '午班', code: 'B' },
    { id: 'st_night', label: '晚班', code: 'C' },
  ])
  const [formData, setFormData] = useState({
    requesterId: 'staff_1',
    requesterName: '王小明',
    targetDate: '',
    targetShiftTypeId: 'st_morning',
    desiredPartnerId: '',
    desiredPartnerName: '',
  })

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/swap-requests?organizationId=org_demo', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || '載入失敗')
      }
      const json = await res.json()
      setRequests(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const cookieToken = getCookie('shiftops_session')
    if (cookieToken) {
      setToken(cookieToken)
    }
    // Decode role from token payload (base64url middle part)
    if (cookieToken) {
      try {
        const parts = cookieToken.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          setUserRole(payload.role || 'MEMBER')
        }
      } catch {}
    }
    loadRequests()
  }, [loadRequests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.targetDate) {
      setError('請選擇目標日期')
      return
    }

    try {
      const res = await fetch('/api/swap-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          organizationId: 'org_demo',
          requesterId: formData.requesterId,
          requesterName: formData.requesterName,
          targetDate: formData.targetDate,
          targetShiftTypeId: formData.targetShiftTypeId,
          desiredPartnerId: formData.desiredPartnerId || undefined,
          desiredPartnerName: formData.desiredPartnerName || undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || '送出失敗')
      }

      setSuccess('調班請求已送出，等待管理者審核')
      setFormData(f => ({ ...f, targetDate: '', desiredPartnerId: '', desiredPartnerName: '' }))
      loadRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗')
    }
  }

  const handleApprove = async (id: string, approve: boolean) => {
    setError(null)
    try {
      const res = await fetch(`/api/swap-requests/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: approve ? 'approved' : 'rejected',
          comment: approve ? '已核准' : '已駁回',
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || '操作失敗')
      }

      setSuccess(approve ? '已核准該調班請求' : '已駁回該調班請求')
      loadRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    }
  }

  const statusLabel: Record<string, string> = {
    pending: '等待審核',
    ai_suggested: 'AI 推荐',
    approved: '已核准',
    rejected: '已駁回',
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    ai_suggested: 'bg-purple-100 text-purple-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">調班請求管理</h1>
          <p className="text-indigo-200 text-sm">Swap Request Management</p>
        </div>
        <button
          onClick={() => router.push('/calendar')}
          className="px-4 py-2 bg-indigo-700 rounded-lg text-sm hover:bg-indigo-800 transition-colors"
        >
          返回月曆
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            ✗ {error}
          </div>
        )}

        {/* Create Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">發起調班請求</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">申請人</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={formData.requesterId}
                  onChange={e => {
                    const s = staff.find(s => s.id === e.target.value)
                    setFormData(f => ({ ...f, requesterId: e.target.value, requesterName: s?.name ?? f.requesterName }))
                  }}
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">目標班別</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={formData.targetShiftTypeId}
                  onChange={e => setFormData(f => ({ ...f, targetShiftTypeId: e.target.value }))}
                >
                  {shiftTypes.map(st => (
                    <option key={st.id} value={st.id}>{st.label} ({st.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">目標日期</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={formData.targetDate}
                  onChange={e => setFormData(f => ({ ...f, targetDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">希望換班對象（可選）</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={formData.desiredPartnerId}
                  onChange={e => {
                    const s = staff.find(s => s.id === e.target.value)
                    setFormData(f => ({ ...f, desiredPartnerId: e.target.value, desiredPartnerName: s?.name ?? '' }))
                  }}
                >
                  <option value="">不指定</option>
                  {staff
                    .filter(s => s.id !== formData.requesterId)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              送出調班請求
            </button>
          </form>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">調班請求列表</h2>
            <button
              onClick={loadRequests}
              className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              重新整理
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">載入中...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-slate-400">尚無調班請求</div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const suggestions = req.aiSuggestions ? JSON.parse(req.aiSuggestions) : []
                return (
                  <div key={req.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{req.requesterName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[req.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {statusLabel[req.status] ?? req.status}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          目標日期：{new Date(req.targetDate).toLocaleDateString('zh-TW')} · 班別：{shiftTypes.find(st => st.id === req.targetShiftTypeId)?.label ?? req.targetShiftTypeId}
                        </div>
                        {req.desiredPartnerName && (
                          <div className="text-sm text-slate-500">希望換班對象：{req.desiredPartnerName}</div>
                        )}
                      </div>
                      {userRole === 'MANAGER' && (req.status === 'pending' || req.status === 'ai_suggested') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id, true)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                          >
                            核准
                          </button>
                          <button
                            onClick={() => handleApprove(req.id, false)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                          >
                            駁回
                          </button>
                        </div>
                      )}
                    </div>

                    {/* AI Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                        <div className="text-xs font-medium text-purple-700 mb-2">🤖 AI 推荐人選</div>
                        <div className="space-y-1">
                          {suggestions.map((s: { staffId: string; name: string; score: number; reason: string }, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{s.name}</span>
                              <span className="text-xs text-purple-600">{(s.score * 100).toFixed(0)}% — {s.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {req.managerComment && (
                      <div className="text-sm text-slate-500 italic">管理員備註：{req.managerComment}</div>
                    )}
                    <div className="text-xs text-slate-400">
                      申請時間：{new Date(req.createdAt).toLocaleString('zh-TW')}
                      {req.approvedAt && ` · 審核時間：${new Date(req.approvedAt).toLocaleString('zh-TW')}`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}