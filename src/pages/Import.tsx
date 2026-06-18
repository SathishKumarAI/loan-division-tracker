import { useEffect, useRef, useState } from 'react'
import { useLoanStore } from '../store/useLoanStore'
import { useUiStore } from '../store/useUiStore'
import { Card, Button, Input, Banner, Tag, EmptyState } from '../components/ui'
import { parseBankPdf } from '../lib/pdfParse'
import type { ParsedRateRow } from '../lib/pdfParse'
import { analyzePdf, backendHealthy } from '../lib/api'
import type { AiConventions, AiValidation } from '../lib/api'

export function Import() {
  const replaceRateTimeline = useLoanStore((s) => s.replaceRateTimeline)
  const setInterestType = useLoanStore((s) => s.setInterestType)
  const setDayCount = useLoanStore((s) => s.setDayCount)
  const toast = useUiStore((s) => s.toast)
  const setTab = useUiStore((s) => s.setTab)
  const fileRef = useRef<HTMLInputElement>(null)

  const [backend, setBackend] = useState<{ ok: boolean; aiMode?: string }>({ ok: false })
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [source, setSource] = useState<'ai' | 'local'>('local')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ParsedRateRow[]>([])
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [validation, setValidation] = useState<AiValidation[]>([])
  const [conventions, setConventions] = useState<AiConventions | null>(null)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    backendHealthy().then(setBackend)
  }, [])

  const onFile = async (file: File) => {
    setStatus('parsing')
    setError('')
    setFileName(file.name)
    setValidation([])
    setConventions(null)
    setSummary('')

    // Prefer the AI backend (Claude reads + validates); fall back to local regex.
    if (backend.ok) {
      try {
        const a = await analyzePdf(file)
        setRows(a.timeline.map((t) => ({ effectiveDate: t.effectiveDate, annualRatePct: t.annualRatePct, raw: t.note ?? 'Claude extraction' })))
        setValidation(a.validation ?? [])
        setConventions(a.conventions ?? null)
        setSummary(a.summary ?? '')
        setRawText('')
        setSource('ai')
        setStatus('done')
        return
      } catch (e) {
        toast(`AI analysis failed, using local parser: ${e instanceof Error ? e.message : ''}`, 'error')
      }
    }

    try {
      const result = await parseBankPdf(file)
      setRows(result.rows)
      setRawText(result.rawText)
      setSource('local')
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read the PDF.')
      setStatus('error')
    }
  }

  const updateRow = (i: number, patch: Partial<ParsedRateRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i))
  const addRow = () =>
    setRows((rs) => [...rs, { effectiveDate: '2024-04-01', annualRatePct: 9, raw: 'manual entry' }])

  const accept = () => {
    const valid = rows
      .filter((r) => r.effectiveDate && r.annualRatePct > 0)
      .sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1))
      .map((r, i) => ({
        id: `imp_${i}_${r.effectiveDate}`,
        effectiveDate: r.effectiveDate,
        annualRatePct: r.annualRatePct,
        note: r.raw.slice(0, 80),
      }))
    replaceRateTimeline(valid)
    // Apply detected conventions when Claude is confident about them.
    if (conventions) {
      if (conventions.interestType === 'reducing' || conventions.interestType === 'flat')
        setInterestType(conventions.interestType)
      if (conventions.dayCount === 'monthly' || conventions.dayCount === 'daily365')
        setDayCount(conventions.dayCount)
    }
    setStatus('idle')
    setRows([])
    setRawText('')
    setValidation([])
    setConventions(null)
    toast(`Applied ${valid.length} rate ${valid.length === 1 ? 'row' : 'rows'} to the loan`, 'success', {
      label: 'View setup',
      run: () => setTab('setup'),
    })
  }

  const vBanner = (v: AiValidation, i: number) => (
    <Banner key={i} kind={v.level === 'error' ? 'error' : v.level === 'warning' ? 'warning' : 'info'}>
      {v.message}
    </Banner>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Import bank PDF</h1>
        <p className="text-sm text-subtext0">
          Upload a bank sanction/statement PDF. Parsed rates are shown for your review — nothing
          drives a calculation until you accept.
        </p>
      </div>

      <Card
        title="Upload"
        subtitle={
          backend.ok
            ? `Claude (${backend.aiMode}) reads & validates the PDF; you confirm before it applies`
            : 'Parsing runs in your browser (local parser). Start the backend for AI extraction.'
        }
        actions={backend.ok ? <Tag color="mauve">AI: {backend.aiMode}</Tag> : <Tag color="overlay0">local parser</Tag>}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => fileRef.current?.click()}>
            Choose PDF
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {fileName && <span className="text-sm text-subtext0">{fileName}</span>}
          {status === 'parsing' && (
            <span className="text-sm text-blue">{backend.ok ? 'Claude is reading the PDF…' : 'Parsing…'}</span>
          )}
        </div>
        {status === 'error' && (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        )}
      </Card>

      {status === 'done' && (
        <>
          {source === 'ai' && summary && (
            <Card title="Claude's read of the document" subtitle="Reasoned summary — review the validation notes below">
              <p className="text-sm text-text">{summary}</p>
              {conventions && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Tag color="blue">interest: {conventions.interestType}</Tag>
                  <Tag color="blue">day-count: {conventions.dayCount}</Tag>
                  <Tag color="overlay0">prepayment: {conventions.prepaymentCharges}</Tag>
                  <Tag color="overlay0">penalty: {conventions.penalty}</Tag>
                </div>
              )}
            </Card>
          )}

          {validation.length > 0 && (
            <Card title="Validation" subtitle="What Claude noticed — resolve warnings before relying on the schedule">
              <div className="space-y-2">{validation.map(vBanner)}</div>
            </Card>
          )}

          <Card
            title="Review parsed rate timeline"
            subtitle={
              source === 'ai'
                ? 'Extracted & validated by Claude — edit, add, or remove rows before accepting'
                : 'Local extraction is imperfect — edit, add, or remove rows before accepting'
            }
            actions={
              <div className="flex gap-2">
                <Button onClick={addRow}>+ Row</Button>
                <Button variant="primary" disabled={rows.length === 0} onClick={accept}>
                  Accept &amp; apply to loan
                </Button>
              </div>
            }
          >
            {rows.length === 0 ? (
              <Banner kind="warning">
                No (date, rate) rows were detected. Use “+ Row” to add them manually
                {source === 'local' ? ' from the raw text below.' : '.'}
              </Banner>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-1 text-xs uppercase tracking-wide text-subtext0">
                  <span className="col-span-3">Effective date</span>
                  <span className="col-span-2">Rate %</span>
                  <span className="col-span-6">{source === 'ai' ? 'Claude note' : 'Parsed from'}</span>
                  <span className="col-span-1" />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <Input
                      className="col-span-3"
                      type="date"
                      aria-label="Effective date"
                      value={r.effectiveDate}
                      onChange={(e) => updateRow(i, { effectiveDate: e.target.value })}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      step="0.05"
                      aria-label="Annual rate percent"
                      value={r.annualRatePct}
                      onChange={(e) => updateRow(i, { annualRatePct: Number(e.target.value) })}
                    />
                    <span className="col-span-6 truncate text-xs text-overlay0" title={r.raw}>
                      {r.raw}
                    </span>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="danger" onClick={() => removeRow(i)} aria-label="Remove">✕</Button>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-xs text-overlay0">
                  Dates in DD/MM/YYYY are read in Indian order. The first row sets the starting rate.
                  {conventions && ' Detected conventions are applied on accept.'}
                </p>
              </div>
            )}
          </Card>

          {source === 'local' && (
            <Card title="Raw extracted text" subtitle="Manual-entry fallback — copy values that the parser missed">
              <pre className="max-h-72 overflow-auto rounded-lg border border-surface0 bg-base p-3 font-mono text-xs text-subtext0 whitespace-pre-wrap">
                {rawText || '(no text extracted)'}
              </pre>
            </Card>
          )}
        </>
      )}

      {status === 'idle' && rows.length === 0 && (
        <EmptyState
          title="No PDF loaded"
          hint="Choose a bank PDF to extract its rate timeline, or enter rates manually under Loan Setup."
        />
      )}
    </div>
  )
}
