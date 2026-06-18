/**
 * Browser-only bank-PDF ingestion (pdf.js layer).
 *
 * Extracts text with x/y coordinates and reconstructs lines by grouping items
 * on the same row; the pure parsers that turn lines into (date, rate) rows live
 * in `pdfParseCore.ts` (unit-tested without a DOM). Table extraction is
 * imperfect, so callers always show parsed rows for review before they drive
 * any calculation, with the raw text as a manual-entry fallback.
 */
import * as pdfjs from 'pdfjs-dist'
// Vite resolves this to a URL string for the worker bundle.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { rowsFromLines } from './pdfParseCore'
import type { ParsedRateRow } from './pdfParseCore'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export { parseDate, parseRate } from './pdfParseCore'
export type { ParsedRateRow } from './pdfParseCore'

export interface PdfParseResult {
  rows: ParsedRateRow[]
  rawText: string
  pageCount: number
}

/** Extract text from a PDF File and reconstruct lines by y-coordinate. */
export async function extractPdfLines(
  file: File,
): Promise<{ lines: string[]; rawText: string; pageCount: number }> {
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    // Group text items by rounded y; within a row, order by x.
    const byRow = new Map<number, { x: number; s: string }[]>()
    for (const item of content.items as { str: string; transform: number[] }[]) {
      if (!item.str.trim()) continue
      const y = Math.round(item.transform[5])
      const x = item.transform[4]
      const arr = byRow.get(y) ?? []
      arr.push({ x, s: item.str })
      byRow.set(y, arr)
    }
    // Pages render top-to-bottom = descending y in PDF space.
    const ys = [...byRow.keys()].sort((a, b) => b - a)
    for (const y of ys) {
      const row = byRow.get(y)!.sort((a, b) => a.x - b.x)
      lines.push(row.map((r) => r.s).join(' ').replace(/\s+/g, ' ').trim())
    }
  }
  return { lines, rawText: lines.join('\n'), pageCount: doc.numPages }
}

/** Full parse: lines → candidate (date, rate) rows, de-duplicated by date. */
export async function parseBankPdf(file: File): Promise<PdfParseResult> {
  const { lines, rawText, pageCount } = await extractPdfLines(file)
  return { rows: rowsFromLines(lines), rawText, pageCount }
}
