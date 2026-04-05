"""
Fusion API: wraps PyPI allin1 (All-In-One Music Structure Analyzer) for HTTP clients.

Uploads are streamed to tempfile.NamedTemporaryFile(delete=False) under the OS temp
directory, analyzed, then removed in a finally block. Files are not saved to any
persistent app folder.
"""

from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

import allin1
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Fusion API", version="0.1.0")

ALLOWED_EXTENSIONS = frozenset({".mp3", ".wav"})


def _max_upload_bytes() -> int:
    mb = float(os.environ.get("FUSION_MAX_UPLOAD_MB", "50"))
    return int(mb * 1024 * 1024)


def _cors_origins() -> list[str]:
    raw = os.environ.get(
        "FUSION_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_result(result: Any) -> dict[str, Any]:
    segments = [
        {
            "label": str(seg.label),
            "start": float(seg.start),
            "end": float(seg.end),
        }
        for seg in result.segments
    ]
    bpm = getattr(result, "bpm", None)
    return {
        "filename": Path(str(result.path)).name,
        "bpm": float(bpm) if bpm is not None else None,
        "segments": segments,
    }


def _normalize_analyze(paths: list[str]) -> list[Any]:
    raw = allin1.analyze(paths)
    if isinstance(raw, list):
        return raw
    return [raw]


def _unlink_quiet(path: str | None) -> None:
    if not path:
        return
    try:
        os.unlink(path)
    except OSError:
        pass


def _validate_filename(filename: str) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return suffix


async def _upload_to_temp(upload: UploadFile) -> tuple[str, str]:
    suffix = _validate_filename(upload.filename or "")
    max_bytes = _max_upload_bytes()
    await upload.seek(0)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    path = tmp.name
    tmp.close()
    try:
        with open(path, "wb") as out:
            shutil.copyfileobj(upload.file, out)
        size = os.path.getsize(path)
        if size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        if size > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large (max {max_bytes // (1024 * 1024)} MB)",
            )
    except HTTPException:
        _unlink_quiet(path)
        raise
    except Exception:
        _unlink_quiet(path)
        raise HTTPException(status_code=400, detail="Failed to store upload")
    return path, upload.filename or ""


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, Any]:
    path: str | None = None
    try:
        path, _ = await _upload_to_temp(file)
        results = _normalize_analyze([path])
        return _serialize_result(results[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {type(e).__name__}",
        ) from e
    finally:
        _unlink_quiet(path)


@app.post("/analyze-pair")
async def analyze_pair(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
) -> dict[str, Any]:
    path_a: str | None = None
    path_b: str | None = None
    try:
        path_a, _ = await _upload_to_temp(file_a)
        path_b, _ = await _upload_to_temp(file_b)
        results = _normalize_analyze([path_a, path_b])
        if len(results) != 2:
            raise HTTPException(
                status_code=500,
                detail="Unexpected analysis result count",
            )
        return {
            "tracks": [_serialize_result(results[0]), _serialize_result(results[1])],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {type(e).__name__}",
        ) from e
    finally:
        _unlink_quiet(path_a)
        _unlink_quiet(path_b)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
