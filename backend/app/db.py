"""SQLite persistence for loan datasets and AI PDF-analysis findings.

A single file DB on a Docker volume — zero-config and right-sized for a
single-user self-host. Datasets and findings are stored as JSON blobs so the
schema tracks the frontend's shapes without migrations.
"""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

DB_PATH = os.environ.get("DB_PATH", "/data/loan.db")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def _conn():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db() -> None:
    with _conn() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS datasets (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                data        TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS findings (
                id          TEXT PRIMARY KEY,
                file_name   TEXT NOT NULL,
                file_hash   TEXT NOT NULL,
                result      TEXT NOT NULL,
                created_at  TEXT NOT NULL
            );
            """
        )


# --- datasets ---
def list_datasets() -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT id, name, updated_at FROM datasets ORDER BY updated_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_dataset(ds_id: str) -> dict | None:
    with _conn() as con:
        row = con.execute("SELECT * FROM datasets WHERE id = ?", (ds_id,)).fetchone()
        if not row:
            return None
        return {"id": row["id"], "name": row["name"], "data": json.loads(row["data"]),
                "updated_at": row["updated_at"]}


def upsert_dataset(ds_id: str, name: str, data: dict) -> dict:
    ts = _now()
    with _conn() as con:
        con.execute(
            """INSERT INTO datasets (id, name, data, updated_at) VALUES (?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET name=excluded.name, data=excluded.data,
               updated_at=excluded.updated_at""",
            (ds_id, name, json.dumps(data), ts),
        )
    return {"id": ds_id, "name": name, "updated_at": ts}


def delete_dataset(ds_id: str) -> None:
    with _conn() as con:
        con.execute("DELETE FROM datasets WHERE id = ?", (ds_id,))


# --- findings ---
def save_finding(fid: str, file_name: str, file_hash: str, result: dict) -> None:
    with _conn() as con:
        con.execute(
            "INSERT INTO findings (id, file_name, file_hash, result, created_at) VALUES (?,?,?,?,?)",
            (fid, file_name, file_hash, json.dumps(result), _now()),
        )


def list_findings() -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT id, file_name, file_hash, result, created_at FROM findings ORDER BY created_at DESC LIMIT 100"
        ).fetchall()
        return [
            {"id": r["id"], "file_name": r["file_name"], "file_hash": r["file_hash"],
             "result": json.loads(r["result"]), "created_at": r["created_at"]}
            for r in rows
        ]
