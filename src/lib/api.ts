/**
 * Thin client for the optional backend (server-side storage + Claude PDF
 * analysis). The app is local-first: every call is guarded, and callers fall
 * back to local behaviour when the backend is absent. Base URL is build-time
 * configurable via VITE_API_URL (defaults to the compose backend on :8000).
 */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export interface AiValidation {
  level: 'info' | 'warning' | 'error'
  message: string
}
export interface AiConventions {
  interestType: string
  dayCount: string
  prepaymentCharges: string
  penalty: string
}
export interface PdfAnalysis {
  finding_id: string
  file_name: string
  pages: number
  ai_mode: string
  timeline: { effectiveDate: string; annualRatePct: number; note?: string }[]
  conventions: AiConventions
  validation: AiValidation[]
  summary: string
}

/** Is the backend reachable? Resolves false on any error (offline / static-only). */
export async function backendHealthy(timeoutMs = 1500): Promise<{ ok: boolean; aiMode?: string }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(`${BASE}/api/health`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!r.ok) return { ok: false }
    const j = await r.json()
    return { ok: true, aiMode: j.ai_mode }
  } catch {
    return { ok: false }
  }
}

export async function analyzePdf(file: File): Promise<PdfAnalysis> {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch(`${BASE}/api/pdf/analyze`, { method: 'POST', body: form })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail.detail ?? `Backend returned ${r.status}`)
  }
  return r.json()
}

// --- dataset storage ---
export interface DatasetMeta {
  id: string
  name: string
  updated_at: string
}

export async function listDatasets(): Promise<DatasetMeta[]> {
  const r = await fetch(`${BASE}/api/datasets`)
  if (!r.ok) throw new Error(`list failed (${r.status})`)
  return r.json()
}

export async function saveDataset(id: string, name: string, data: unknown): Promise<DatasetMeta> {
  const r = await fetch(`${BASE}/api/datasets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data }),
  })
  if (!r.ok) throw new Error(`save failed (${r.status})`)
  return r.json()
}

export async function getDataset(id: string): Promise<{ id: string; name: string; data: unknown }> {
  const r = await fetch(`${BASE}/api/datasets/${id}`)
  if (!r.ok) throw new Error(`get failed (${r.status})`)
  return r.json()
}
