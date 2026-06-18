"""FastAPI backend: server-side dataset storage + Claude PDF analysis.

Additive to the local-first SPA — the calculator works without this service;
the backend adds cross-device storage and AI-assisted PDF validation. All AI
output is returned for human confirmation before it drives any calculation.
"""
from __future__ import annotations

import hashlib
import os
import tempfile
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import db
from .ai import AI_MODE, analyze_pdf
from .pdf import extract_text, page_count, render_images

app = FastAPI(title="Loan Division Tracker API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://localhost:8090,http://localhost:5173"
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "ai_mode": AI_MODE}


# --- datasets (server-side storage) ---
class DatasetIn(BaseModel):
    name: str
    data: dict


@app.get("/api/datasets")
def datasets() -> list[dict]:
    return db.list_datasets()


@app.get("/api/datasets/{ds_id}")
def get_dataset(ds_id: str) -> dict:
    ds = db.get_dataset(ds_id)
    if not ds:
        raise HTTPException(404, "dataset not found")
    return ds


@app.put("/api/datasets/{ds_id}")
def put_dataset(ds_id: str, body: DatasetIn) -> dict:
    return db.upsert_dataset(ds_id, body.name, body.data)


@app.delete("/api/datasets/{ds_id}")
def remove_dataset(ds_id: str) -> dict:
    db.delete_dataset(ds_id)
    return {"deleted": ds_id}


# --- AI PDF analysis ---
@app.post("/api/pdf/analyze")
async def pdf_analyze(file: UploadFile = File(...)) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "empty file")
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(413, "PDF too large (max 20 MB)")
    file_hash = hashlib.sha256(raw).hexdigest()[:16]

    with tempfile.TemporaryDirectory() as workdir:
        text = extract_text(raw)
        images = render_images(raw, workdir)
        try:
            result = analyze_pdf(text, images, workdir)
        except Exception as e:  # surface a clean error to the UI
            raise HTTPException(502, f"AI analysis failed: {e}")

    fid = uuid.uuid4().hex[:12]
    finding = {
        "file_name": file.filename,
        "file_hash": file_hash,
        "pages": page_count(raw),
        "ai_mode": AI_MODE,
        **result,
    }
    db.save_finding(fid, file.filename or "upload.pdf", file_hash, finding)
    return {"finding_id": fid, **finding}


@app.get("/api/findings")
def findings() -> list[dict]:
    return db.list_findings()
