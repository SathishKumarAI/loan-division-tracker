import { useRef, useState } from 'react'
import { useLoanStore } from '../store/useLoanStore'
import { Card, Button, Input, Banner, EmptyState } from '../components/ui'
import { parseBankPdf } from '../lib/pdfParse'
import type { ParsedRateRow } from '../lib/pdfParse'

export function Import() {
  const replaceRateTimeline = useLoanStore((s) => s.replaceRateTimeline)
  const fileRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ParsedRateRow[]>([])
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')

  const onFile = async (file: File) => {
    setStatus('parsing')
    setError('')
    setFileName(file.name)
    try {
      const result = await parseBankPdf(file)
      setRows(result.rows)
      setRawText(result.rawText)
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
    setStatus('idle')
    setRows([])
    setRawText('')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Import bank PDF</h1>
        <p className="text-sm text-subtext0">
          Upload a bank sanction/statement PDF. Parsed rates are shown for your review — nothing
          drives a calculation until you accept.
        </p>
      </div>

      <Card title="Upload" subtitle="Parsing runs entirely in your browser; the file never leaves your device">
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
          {status === 'parsing' && <span className="text-sm text-blue">Parsing…</span>}
        </div>
        {status === 'error' && (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        )}
      </Card>

      {status === 'done' && (
        <>
          <Card
            title="Review parsed rate timeline"
            subtitle="Table extraction is imperfect — edit, add, or remove rows before accepting"
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
                No (date, rate) rows were detected automatically. Use the raw text below to add rows
                manually with “+ Row”.
              </Banner>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-1 text-xs uppercase tracking-wide text-subtext0">
                  <span className="col-span-3">Effective date</span>
                  <span className="col-span-2">Rate %</span>
                  <span className="col-span-6">Parsed from</span>
                  <span className="col-span-1" />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <Input
                      className="col-span-3"
                      type="date"
                      value={r.effectiveDate}
                      onChange={(e) => updateRow(i, { effectiveDate: e.target.value })}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      step="0.05"
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
                </p>
              </div>
            )}
          </Card>

          <Card title="Raw extracted text" subtitle="Manual-entry fallback — copy values that the parser missed">
            <pre className="max-h-72 overflow-auto rounded-lg border border-surface0 bg-base p-3 font-mono text-xs text-subtext0 whitespace-pre-wrap">
              {rawText || '(no text extracted)'}
            </pre>
          </Card>
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
