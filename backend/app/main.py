"""
main.py — FastAPI server for the Sonic Fingerprint Lab.

Endpoints
─────────
GET  /api/health            — liveness probe (frontend polls this)
POST /api/upload            — decode audio, return metadata + mono warning
POST /api/visualize         — render spectrogram (FASTAPI PATH);
                              returns 501 for modes handled by the browser
POST /api/fetch-url         — proxy a remote audio URL to dodge CORS

Rendering split
───────────────
FASTAPI PATH  → /api/visualize?mode=spectrogram  uses librosa + matplotlib
BROWSER PATH  → all other modes; this server returns HTTP 501 so the
               frontend knows to use its Canvas renderer instead

CORS
────
Allows http://localhost:5175 (Vite dev server) and any origin when
ALLOW_ORIGINS env var is set (e.g. "https://your-render-deployment.com").
"""

from __future__ import annotations

import io
import os

import httpx
import librosa
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from .audio_viz import render_spectrogram

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="Sonic Fingerprint Lab API", version="0.1.0")

_extra_origins = [o.strip() for o in os.getenv("ALLOW_ORIGINS", "").split(",") if o.strip()]
_origins = ["http://localhost:5175", "http://127.0.0.1:5175", *_extra_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────────────────────────────

SUPPORTED_CONTENT_TYPES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/flac", "audio/aac", "application/octet-stream",
}

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


async def _read_audio(upload: UploadFile) -> tuple[np.ndarray, int, int]:
    """
    Read an uploaded file and return (samples_mono, sample_rate, n_channels).
    samples_mono is a float32 numpy array in range −1..1.
    """
    raw = await upload.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 50 MB)")

    buf = io.BytesIO(raw)
    try:
        # soundfile is faster for wav/flac; librosa handles mp3 via audioread
        data, sr = sf.read(buf, dtype="float32", always_2d=True)
    except Exception:
        buf.seek(0)
        try:
            data, sr = librosa.load(buf, sr=None, mono=False)
            if data.ndim == 1:
                data = data[np.newaxis, :]  # make 2-D (channels × samples)
            else:
                data = data  # librosa returns (channels, samples)
            # sf returns (samples, channels) — transpose to match
            data = data.T
        except Exception as exc:
            raise HTTPException(422, f"Cannot decode audio: {exc}") from exc

    n_channels = data.shape[1] if data.ndim > 1 else 1
    # Convert to (samples, channels) if not already
    if data.ndim == 1:
        data = data[:, np.newaxis]

    # Mix to mono for analysis
    mono = np.mean(data, axis=1).astype(np.float32)
    return mono, int(sr), n_channels


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)) -> JSONResponse:
    """
    Decode audio and return metadata.
    Includes a mono warning when Phase Look is selected on a mono file.
    """
    mono, sr, n_channels = await _read_audio(file)
    duration = len(mono) / sr

    result: dict = {
        "filename": file.filename,
        "duration": round(duration, 4),
        "sample_rate": sr,
        "channels": n_channels,
    }

    if n_channels == 1:
        result["message"] = (
            "Phase Look visualization requires a stereo file to compare "
            "Left and Right channels. You can use Auto-Stereo in the UI to "
            "create a fake stereo effect from the mono signal."
        )

    return JSONResponse(result)


# Modes the browser handles — server returns 501 so frontend falls back
_BROWSER_MODES = {"waveform", "density", "solid", "phase", "mandala"}


@app.post("/api/visualize")
async def visualize(
    file: UploadFile = File(...),
    mode: str = Form("spectrogram"),
    style: str = Form("lines"),
    lofi_skip: int = Form(1),
) -> JSONResponse:
    """
    Render a visualization and return { image_b64: '...' }.

    FASTAPI PATH  → mode='spectrogram': uses librosa mel-spectrogram + matplotlib.
    BROWSER PATH  → all other modes return HTTP 501 so the frontend Canvas
                    renderer takes over.
    """
    if mode in _BROWSER_MODES:
        raise HTTPException(
            501,
            f"Mode '{mode}' is rendered in the browser. "
            "The frontend should not call /api/visualize for this mode.",
        )

    mono, sr, _channels = await _read_audio(file)

    # Apply Lo-Fi decimation server-side if requested
    if lofi_skip > 1:
        mono = mono[::lofi_skip]
        sr = max(1, sr // lofi_skip)

    if mode == "spectrogram":
        b64 = render_spectrogram(mono, sr, style=style, lofi_skip=lofi_skip)
        return JSONResponse({"image_b64": b64, "source": "fastapi"})

    raise HTTPException(400, f"Unknown mode: {mode}")


class FetchUrlRequest(BaseModel):
    url: str


@app.post("/api/fetch-url")
async def fetch_url(body: FetchUrlRequest) -> Response:
    """
    Proxy a remote audio URL back to the browser to avoid CORS issues.

    HYBRID PATH: the browser audio pipeline calls this when a URL is pasted
    into the URL input box. The bytes are returned as-is; the browser then
    decodes with decodeAudioData() (same as a local file).
    """
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "Only http:// and https:// URLs are supported")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            r = await client.get(url, headers={"User-Agent": "SonicLabBot/1.0"})
        r.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(502, f"Remote returned {exc.response.status_code}") from exc
    except httpx.RequestError as exc:
        raise HTTPException(502, f"Could not reach {url}: {exc}") from exc

    content_type = r.headers.get("content-type", "application/octet-stream").split(";")[0]
    return Response(content=r.content, media_type=content_type)
