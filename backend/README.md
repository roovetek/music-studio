# Sonic Lab — FastAPI Backend

Optional Python server that provides **librosa-powered spectrogram rendering** for the Sonic Fingerprint Lab. All other visualization modes (waveform, density, solid, phase, mandala) run entirely in the browser — the server is only needed for the polished Mel spectrogram.

## Rendering split

| Mode | Where it runs |
|------|---------------|
| Spectrogram | **FastAPI** → `librosa` + `matplotlib` → Base64 PNG |
| Waveform | Browser Canvas |
| Density | Browser Canvas |
| Solid | Browser Canvas |
| Phase (Lissajous) | Browser Canvas |
| Mandala | Browser Canvas |

When the FastAPI server is not running, the Spectrogram mode falls back to the browser's own STFT renderer (`src/utils/audio/fft.ts`). A yellow "Browser STFT" badge appears so users know the server path wasn't used.

## Requirements

- Python 3.12
- [uv](https://docs.astral.sh/uv/) (package manager)

## Setup

```bash
cd backend
uv venv
uv sync
```

## Run (development)

```bash
# In one terminal:
uv run uvicorn app.main:app --reload --port 8000

# In another terminal (repo root):
npm run dev
```

Vite proxies `/api/*` → `http://localhost:8000` so you never see the port in browser requests.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness probe — frontend polls this on page load |
| POST | `/api/upload` | Decode audio; return `{ filename, duration, sample_rate, channels, message? }` |
| POST | `/api/visualize` | Render spectrogram (multipart: `file`, `mode`, `style`, `lofi_skip`) → `{ image_b64 }` |
| POST | `/api/fetch-url` | Proxy remote audio URL to avoid CORS (JSON: `{ url }`) → raw audio bytes |

## Deploy to Render / Railway / Fly.io

1. Set env var `ALLOW_ORIGINS=https://your-pages-url.github.io` (or `*` for open access).
2. Set `VITE_API_BASE_URL=https://your-backend.onrender.com` in your Vite/Pages build env.
3. The frontend will use FastAPI for spectrogram and the browser fallback for everything else.

## audio_viz.py — adding more server-side modes

Each stub function in `app/audio_viz.py` can be fleshed out with a matplotlib renderer and wired into the `/api/visualize` endpoint by removing it from the `_BROWSER_MODES` set in `app/main.py`.
