"""
audio_viz.py — Visualization engine for the Sonic Fingerprint Lab.

PYTHON PATH: All functions here run server-side on the FastAPI process.
The browser never touches numpy/librosa/matplotlib directly.

Each public function:
  • accepts raw numpy audio data + metadata
  • returns a Base64-encoded PNG string
  • accepts a 'style' parameter ('dots' or 'lines')

Modes:
  1. spectrogram  — librosa STFT → matplotlib specshow  (FASTAPI PATH)
  2. waveform     — amplitude vs time                   (stub — browser handles)
  3. density      — scatter with low alpha              (stub — browser handles)
  4. phase        — Lissajous L vs R                    (stub — browser handles)
  5. solid        — fill_between silhouette             (stub — browser handles)
  6. mandala      — polar plot                          (stub — browser handles)

The stubs return 501 so the frontend knows to fall back to its Canvas renderer.
Only spectrogram is wired; the others are easy to enable by replacing the stub.
"""

from __future__ import annotations

import base64
import io

import librosa
import librosa.display
import matplotlib
import matplotlib.pyplot as plt
import numpy as np

# Use non-interactive Agg backend — no GUI, safe in a server process
matplotlib.use("Agg")

_FIGSIZE = (10, 4)
_DPI = 110


def _fig_to_b64(fig: plt.Figure) -> str:
    """Serialize a matplotlib figure to a Base64 PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


# ── 1. Spectrogram (FASTAPI PATH — fully wired) ──────────────────────────────

def render_spectrogram(
    samples: np.ndarray,
    sr: int,
    style: str = "lines",
    lofi_skip: int = 1,
) -> str:
    """
    Mel spectrogram using librosa STFT + matplotlib specshow.

    Parameters
    ----------
    samples   : mono float32 numpy array (−1..1)
    sr        : sample rate (already adjusted if lofi was applied upstream)
    style     : 'lines' | 'dots' — ignored for spectrogram; kept for API symmetry
    lofi_skip : informational only at this point; caller decimates before sending
    """
    # Compute mel spectrogram
    n_fft = 2048
    hop_length = 512
    n_mels = 128

    S = librosa.feature.melspectrogram(
        y=samples,
        sr=sr,
        n_fft=n_fft,
        hop_length=hop_length,
        n_mels=n_mels,
    )
    S_db = librosa.power_to_db(S, ref=np.max)

    fig, ax = plt.subplots(figsize=_FIGSIZE, dpi=_DPI, facecolor="#0d0d0d")
    ax.set_facecolor("#0d0d0d")

    img = librosa.display.specshow(
        S_db,
        sr=sr,
        hop_length=hop_length,
        x_axis="time",
        y_axis="mel",
        ax=ax,
        cmap="magma",
    )
    fig.colorbar(img, ax=ax, format="%+2.0f dB", label="dB")
    ax.set_title("Mel Spectrogram (FastAPI · librosa)", color="#e0e0e0", pad=6)
    ax.tick_params(colors="#a0a0a0")
    ax.xaxis.label.set_color("#a0a0a0")
    ax.yaxis.label.set_color("#a0a0a0")
    for spine in ax.spines.values():
        spine.set_edgecolor("#444")

    return _fig_to_b64(fig)


# ── 2–6. Browser-handled modes (stubs) ───────────────────────────────────────
# The frontend Canvas renderer is the primary implementation for these modes.
# Uncomment and flesh out to move rendering server-side in the future.

def render_waveform(samples: np.ndarray, sr: int, style: str = "lines") -> None:
    """Stub — rendered in the browser."""
    return None


def render_density(samples: np.ndarray, sr: int, style: str = "dots") -> None:
    """Stub — rendered in the browser."""
    return None


def render_phase(
    left: np.ndarray, right: np.ndarray, sr: int, style: str = "dots"
) -> None:
    """Stub — rendered in the browser."""
    return None


def render_solid(samples: np.ndarray, sr: int, style: str = "lines") -> None:
    """Stub — rendered in the browser."""
    return None


def render_mandala(samples: np.ndarray, sr: int, style: str = "lines") -> None:
    """Stub — rendered in the browser."""
    return None
