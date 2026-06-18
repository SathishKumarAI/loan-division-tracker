# syntax=docker/dockerfile:1
# Backend image: Python (FastAPI + PyMuPDF) plus Node for the Claude Code CLI.
# Node base so the `claude` CLI runs; Python installed on top for the API.
FROM node:24-bookworm-slim

# Python runtime + build essentials for any wheels that need them.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Claude Code CLI (used when AI_MODE=claude_cli). Auth is mounted at runtime.
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH
RUN python3 -m venv /opt/venv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
