/** Radix-2 FFT (real input → complex spectrum). N must be a power of 2. */

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) {
    p *= 2;
  }
  return p;
}

/** In-place bit-reversal permutation for radix-2 FFT. */
function bitReverseInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  let j = 0;
  for (let i = 1; i < n; i += 1) {
    let k = n >> 1;
    while (j & k) {
      j ^= k;
      k >>= 1;
    }
    j |= k;
    if (i < j) {
      const t0 = re[i]!;
      re[i] = re[j]!;
      re[j] = t0;
      const t1 = im[i]!;
      im[i] = im[j]!;
      im[j] = t1;
    }
  }
}

/**
 * Cooley–Tukey in-place forward FFT. `re` and `im` are length N (power of 2);
 * on entry, `im` is typically zeros for real time-domain input.
 */
export function fftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n !== im.length) {
    throw new Error('fftInPlace: length mismatch');
  }
  if (!isPowerOfTwo(n)) {
    throw new Error('fftInPlace: N must be a power of 2');
  }
  if (n <= 1) {
    return;
  }
  bitReverseInPlace(re, im);
  for (let len = 2; len <= n; len *= 2) {
    const half = len * 0.5;
    const ang = -((2 * Math.PI) / len);
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j += 1) {
        const u = i + j;
        const v = u + half;
        const tRe = wRe * re[v]! - wIm * im[v]!;
        const tIm = wRe * im[v]! + wIm * re[v]!;
        re[v] = re[u]! - tRe;
        im[v] = im[u]! - tIm;
        re[u] = re[u]! + tRe;
        im[u] = im[u]! + tIm;
        const nextWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextWRe;
      }
    }
  }
}

/** Apply Hann window to a segment (in-place, length n). */
export function applyHannWindow(x: Float32Array): void {
  const n = x.length;
  if (n <= 1) {
    return;
  }
  for (let i = 0; i < n; i += 1) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    x[i]! *= w;
  }
}

/** |X[k]| for k = 0..N/2 (inclusive) after forward FFT. */
export function magnitudesOneSided(
  re: Float32Array,
  im: Float32Array,
  sampleRate: number,
): { hz: Float32Array; mag: Float32Array } {
  const n = re.length;
  const nBins = n * 0.5 + 1;
  const hz = new Float32Array(nBins);
  const mag = new Float32Array(nBins);
  const df = sampleRate / n;
  for (let k = 0; k < nBins; k += 1) {
    hz[k]! = k * df;
    const a = re[k]!;
    const b = im[k]!;
    mag[k]! = Math.sqrt(a * a + b * b);
  }
  return { hz, mag };
}

/**
 * Real signal → one-sided magnitude spectrum. If `samples` is longer than
 * `fftSize`, only the first `fftSize` values are used; if shorter, the frame is
 * zero-padded to `fftSize`.
 */
export function realFftMagnitude(
  samples: Float32Array,
  fftSize: number,
  sampleRate: number,
  options: { hann: boolean } = { hann: true },
): { hz: Float32Array; mag: Float32Array; usedSamples: number } {
  if (!isPowerOfTwo(fftSize)) {
    throw new Error('realFftMagnitude: fftSize must be a power of 2');
  }
  const n = fftSize;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const take = Math.min(samples.length, n);
  for (let i = 0; i < take; i += 1) {
    re[i] = samples[i] ?? 0;
  }
  if (options.hann) {
    applyHannWindow(re.subarray(0, take));
  }
  fftInPlace(re, im);
  const { hz, mag } = magnitudesOneSided(re, im, sampleRate);
  return { hz, mag, usedSamples: take };
}

export type StftResult = {
  frameCount: number;
  binCount: number;
  sampleRate: number;
  hopSamples: number;
  fftSize: number;
  /** Row-major: frame 0, all bins, then frame 1, … (length = frameCount * binCount) */
  mags: Float32Array;
};

/**
 * STFT: sliding Hann (optional) window, forward FFT, one-sided magnitudes.
 * Stops when the window no longer fully fits: `start + fftSize <= length`.
 * If the signal would produce more than `maxFrames` columns, the hop is
 * increased (keeping overlap intent only approximately) to cap work.
 */
export function stftMagnitudes(
  samples: Float32Array,
  sampleRate: number,
  options: { fftSize: number; hann: boolean; hop: number; maxFrames?: number },
): StftResult {
  if (!isPowerOfTwo(options.fftSize)) {
    throw new Error('stftMagnitudes: fftSize must be a power of 2');
  }
  const n = options.fftSize;
  const nBins = n * 0.5 + 1;
  const maxFrames = options.maxFrames ?? 1200;
  const len = samples.length;
  if (len < n) {
    const { mag } = realFftMagnitude(samples, n, sampleRate, { hann: options.hann });
    return {
      frameCount: 1,
      binCount: nBins,
      sampleRate,
      hopSamples: len,
      fftSize: n,
      mags: mag,
    };
  }
  let hop0 = Math.max(1, Math.min(Math.floor(options.hop), n));
  const maxStart = len - n;
  let nFrames = 1 + Math.floor(maxStart / hop0);
  if (nFrames > maxFrames) {
    hop0 = Math.max(1, Math.floor(maxStart / (maxFrames - 1)));
    nFrames = 1 + Math.floor(maxStart / hop0);
  }
  const out = new Float32Array(nFrames * nBins);
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let f = 0, start = 0; f < nFrames; f += 1, start += hop0) {
    for (let i = 0; i < n; i += 1) {
      re[i] = samples[start + i] ?? 0;
      im[i] = 0;
    }
    if (options.hann) {
      applyHannWindow(re);
    }
    fftInPlace(re, im);
    for (let k = 0; k < nBins; k += 1) {
      const a = re[k]!;
      const b = im[k]!;
      out[f * nBins + k]! = Math.sqrt(a * a + b * b);
    }
  }
  return {
    frameCount: nFrames,
    binCount: nBins,
    sampleRate,
    hopSamples: hop0,
    fftSize: n,
    mags: out,
  };
}
