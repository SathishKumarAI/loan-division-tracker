"""PDF ingestion — extract text and render page images with PyMuPDF (fitz).

PyMuPDF bundles its own rendering, so no system poppler dependency is needed in
the container. Both signals are produced: text for cheap/accurate digital PDFs,
and page PNGs so Claude's vision can read scans and complex tables the text
layer mangles.
"""
from __future__ import annotations

import os
import fitz  # PyMuPDF


def extract_text(pdf_bytes: bytes, max_chars: int = 60_000) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    parts: list[str] = []
    for page in doc:
        parts.append(page.get_text("text"))
    doc.close()
    text = "\n".join(parts).strip()
    return text[:max_chars]


def render_images(pdf_bytes: bytes, workdir: str, max_pages: int = 8, dpi: int = 150) -> list[str]:
    """Render up to max_pages to PNGs in workdir; return their paths."""
    os.makedirs(workdir, exist_ok=True)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    paths: list[str] = []
    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        pix = page.get_pixmap(matrix=mat)
        p = os.path.join(workdir, f"page-{i + 1}.png")
        pix.save(p)
        paths.append(p)
    doc.close()
    return paths


def page_count(pdf_bytes: bytes) -> int:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    n = doc.page_count
    doc.close()
    return n
