# Fusion API (allin1)

> **Status:** experimental **stand-alone** service. The main Music Studio web app does **not** call this API yet (no `fusion` integration in `src/`). Useful if you want to experiment with segment detection (intro, verse, chorus, etc.) separately from the shipped UI.

Local HTTP service that runs the [All-In-One Music Structure Analyzer](https://pypi.org/project/allin1/) (`pip install allin1`) for boundary and alignment metadata over HTTP.

## Setup

1. Create a virtual environment and install PyTorch for your platform ([pytorch.org](https://pytorch.org/)).
2. Install dependencies:

   ```bash
   cd fusion
   pip install -r requirements.txt
   ```

   On Linux and Windows, [NATTEN](https://www.shi-labs.com/natten/) may be required per the upstream README. macOS often installs it automatically.

3. Optional: install **FFmpeg** for reliable MP3 decoding (recommended upstream).

## Run

```bash
cd fusion
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

- **CORS:** By default, `http://localhost:5175` and `http://127.0.0.1:5175` are allowed (match root [`vite.config.ts`](../vite.config.ts) `server.port`). Override with `FUSION_CORS_ORIGINS` (comma-separated), e.g. `http://localhost:5175,https://yourapp.example`.

## Where uploads go

Files are **not** saved to an application data folder. Each upload is streamed into a **`tempfile.NamedTemporaryFile(delete=False)`** in the OS temp directory using **`shutil.copyfileobj`**, analyzed by `allin1`, then **`os.unlink`**’d in a **`finally`** block. Only in-memory/temp paths exist during a request.

## Limits and allowed types

- **Extensions:** `.mp3` and `.wav` only (same as the Vite client). MIDI (`.mid` / `.midi`) is not accepted — `allin1` analyzes audio, not MIDI note data.
- **Size:** **`FUSION_MAX_UPLOAD_MB`** (default **10**) per file. Oversize uploads get HTTP **413** after the temp file is written (keep limits aligned with the frontend).

## Endpoints

- `GET /health` — liveness check.
- `POST /analyze` — multipart field `file`: one audio file (e.g. MP3/WAV).
- `POST /analyze-pair` — multipart fields `file_a`, `file_b`: two files in one request.

Responses include `bpm` and `segments` with `label`, `start`, and `end` (seconds).

## Frontend (Vite)

If you wire a client later, the repo’s Vite dev server uses port **5175** (see root `vite.config.ts`). Run `npm run dev` from the project root.

Only env vars prefixed with **`VITE_`** are exposed to the browser.

- **`VITE_FUSION_API_URL`** — API base (no trailing slash), e.g. `http://127.0.0.1:8001`. Default in code if unset: `http://127.0.0.1:8001`.
- **`VITE_MAX_UPLOAD_MB`** — max upload size in MB for client-side checks (default **10**). Should match **`FUSION_MAX_UPLOAD_MB`** on the API.

## Optional: Replicate (no local GPU)

You can run the same class of model on [Replicate](https://replicate.com/sakemin/all-in-one-music-structure-analyzer) with an API token and different client code; the segment JSON shape (`label` / `start` / `end`) remains compatible with the same “first chorus” alignment logic on the frontend.
