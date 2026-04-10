"""
Cricket Vision API: YOLO pose + ball detect, rules engine, Ollama narrative, WebSocket telemetry.
"""

from __future__ import annotations

import os
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import logging

from processing import SessionManager
from vision.pipeline import VisionPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_VIDEO = frozenset({".mp4", ".webm", ".mov", ".mkv", ".avi"})

_pipeline: VisionPipeline | None = None
manager = SessionManager()


def _max_upload_bytes() -> int:
    mb = float(os.environ.get("CRICKET_MAX_UPLOAD_MB", "200"))
    return int(mb * 1024 * 1024)


def _cors_origins() -> list[str]:
    raw = os.environ.get(
        "CRICKET_CORS_ORIGINS",
        "http://localhost:5174,http://127.0.0.1:5174",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pipeline
    logger.info("Loading vision pipeline (YOLO weights may download on first run)...")
    _pipeline = VisionPipeline()
    manager.attach_pipeline(_pipeline)
    yield
    _pipeline = None


app = FastAPI(title="Cricket Vision API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_video(name: str) -> str:
    if not name:
        raise HTTPException(status_code=400, detail="Missing filename")
    suf = Path(name).suffix.lower()
    if suf not in ALLOWED_VIDEO:
        raise HTTPException(
            status_code=400,
            detail=f"Allowed video types: {', '.join(sorted(ALLOWED_VIDEO))}",
        )
    return suf


async def _save_upload(upload: UploadFile) -> str:
    _validate_video(upload.filename or "")
    max_b = _max_upload_bytes()
    await upload.seek(0)
    suf = Path(upload.filename or "video.mp4").suffix.lower()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suf)
    path = tmp.name
    tmp.close()
    try:
        with open(path, "wb") as out:
            shutil.copyfileobj(upload.file, out)
        size = os.path.getsize(path)
        if size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        if size > max_b:
            raise HTTPException(
                status_code=413,
                detail=f"File too large (max {max_b // (1024 * 1024)} MB)",
            )
    except HTTPException:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise
    except Exception:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise HTTPException(status_code=400, detail="Failed to store upload")
    return path


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sessions")
async def create_session(file: UploadFile = File(...)) -> dict[str, Any]:
    path = await _save_upload(file)
    sess = await manager.create_session(path)
    ws_path = f"/ws/stream/{sess.id}"
    base = os.environ.get("CRICKET_PUBLIC_WS_BASE", "").rstrip("/")
    out: dict[str, Any] = {"session_id": sess.id, "ws_path": ws_path}
    if base:
        out["websocket_url"] = f"{base}{ws_path}"
    return out


@app.websocket("/ws/stream/{session_id}")
async def websocket_stream(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    sess = await manager.subscribe_ws(session_id, websocket)
    if not sess:
        await websocket.close(code=4004)
        return
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.unsubscribe_ws(session_id, websocket)
