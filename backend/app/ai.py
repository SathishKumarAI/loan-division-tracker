"""AI bridge for bank-PDF analysis.

Sends the extracted text + rendered page images to Claude and asks for a
structured, *validated* rate timeline and loan conventions. Two modes:

- ``claude_cli`` (default): shell out to the locally-authenticated Claude Code
  CLI (subscription, no per-token billing). Images are read via the Read tool.
- ``anthropic_api``: call the Messages API with ANTHROPIC_API_KEY (vision).

Both return the same dict shape. The model is told to return JSON only; the
result is still shown to the user for confirmation before it drives any maths.
"""
from __future__ import annotations

import base64
import json
import os
import subprocess

AI_MODE = os.environ.get("AI_MODE", "claude_cli")
MODEL = os.environ.get("AI_MODEL", "claude-opus-4-8")

SCHEMA = """{
  "timeline": [{"effectiveDate": "YYYY-MM-DD", "annualRatePct": <number>, "note": "<short source/why>"}],
  "conventions": {
    "interestType": "reducing | flat | unknown",
    "dayCount": "monthly | daily365 | unknown",
    "prepaymentCharges": "<text or 'none stated'>",
    "penalty": "<text or 'none stated'>"
  },
  "validation": [{"level": "info | warning | error", "message": "<what you noticed>"}],
  "summary": "<one or two sentence plain-language summary>"
}"""

INSTRUCTIONS = (
    "You are validating a bank loan PDF for a loan-division EMI tracker.\n"
    "From the text and page images, extract the variable interest-rate timeline and the loan "
    "conventions, and REASON about correctness: flag dates out of order, implausible rate jumps, "
    "gaps in coverage, missing fields, or a stated EMI that doesn't match the rates. Dates in "
    "DD/MM/YYYY are Indian order. Output ONLY a single JSON object, no prose, no markdown fences, "
    "matching exactly this shape:\n" + SCHEMA
)


def _extract_json(s: str) -> dict:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("```", 2)[1]
        if s.startswith("json"):
            s = s[4:]
    start, end = s.find("{"), s.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object in model output: {s[:200]}")
    return json.loads(s[start : end + 1])


def _analyze_cli(text: str, image_paths: list[str], workdir: str) -> dict:
    refs = " ".join(f"@{p}" for p in image_paths)
    prompt = (
        f"{INSTRUCTIONS}\n\n--- EXTRACTED TEXT ---\n{text or '(no text layer)'}\n\n"
        f"--- PAGE IMAGES (read each) ---\n{refs}\n"
    )
    cmd = [
        "claude", "-p",
        "--output-format", "json",
        "--allowedTools", "Read",
        "--add-dir", workdir,
        "--model", MODEL,
    ]
    proc = subprocess.run(
        cmd, input=prompt, capture_output=True, text=True, timeout=300
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI failed ({proc.returncode}): {proc.stderr[:500]}")
    outer = json.loads(proc.stdout)
    if outer.get("is_error"):
        raise RuntimeError(f"claude CLI error: {outer.get('result', '')[:500]}")
    return _extract_json(outer["result"])


def _analyze_api(text: str, image_paths: list[str]) -> dict:
    from anthropic import Anthropic

    client = Anthropic()  # reads ANTHROPIC_API_KEY
    content: list[dict] = [{"type": "text", "text": INSTRUCTIONS + "\n\nTEXT:\n" + (text or "(none)")}]
    for p in image_paths:
        with open(p, "rb") as f:
            b64 = base64.standard_b64encode(f.read()).decode()
        content.append(
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}}
        )
    msg = client.messages.create(
        model=MODEL, max_tokens=4096, messages=[{"role": "user", "content": content}]
    )
    return _extract_json(msg.content[0].text)


def analyze_pdf(text: str, image_paths: list[str], workdir: str) -> dict:
    if AI_MODE == "anthropic_api":
        return _analyze_api(text, image_paths)
    if AI_MODE == "off":
        raise RuntimeError("AI is disabled (AI_MODE=off).")
    return _analyze_cli(text, image_paths, workdir)
