---
name: Metronome pulse visuals
overview: Fix drum pattern tracker colors so every 16th that actually plays (K/S/hat) is lit per the same logic as `playDrumPatternStepAt`; add D vs U distinct colors for strum/groove using theme CSS variables. Keep rest/ghost as today.
todos:
  - id: drum-activity
    content: "Shared helper: for each linear step, grid16; mirror playDrumPatternStepAt to classify event (none/kick/snare/hat/mixed); pass from hook to visualizer"
  - id: visualizer-drum
    content: "MetronomeVisualizer: for drums-pattern, use activity to pick segment fill (not isMainBeat-only); color kick vs snare vs hat optional tier-2"
  - id: d-u-strum
    content: "stepStrumTokens (R G D U) + --metro-pulse-down / --metro-pulse-up for strum+groove (prior plan)"
  - id: hint-align
    content: "Optional: align BEAT_SOURCE_PATTERN_HINT drums string with true 16-step map if it diverges from patternSynth"
  - id: verify
    content: 4/4 16th + Syncopated groove; strum with D and U; typecheck
---

# Metronome pulse bar — colors (updated)

## Problem (screenshot: Syncopated groove)

- Pattern line: `K . . . S . K . K . . . S . K .` implies hits on more than the four quarter onsets.
- **Audio** in [`playDrumPatternStepAt`](src/utils/metronome/patternSynth.ts) is driven by `grid16 = floor((step * 16) / totalBeats) % 16` (same as the hook) and fires kick/snare/hat on many **non** downbeat 16th slots (e.g. `grid16` 6, 8, 14, …).
- **Visual** in [`MetronomeVisualizer.tsx`](src/components/metronome/MetronomeVisualizer.tsx) uses `getBeatColor(…, isSubdivision)` where `isSubdivision = (index % stepsPerBeat !== 0)`. In 4/4 **16ths**, only indices **0, 4, 8, 12** look like strong “beat” colors; other steps use **idle subdivision gray** even when a kick/snare/hat event plays there — hence steps such as 7 and 15 (1-based) in the user mock stay dark.

## Fix: drum activity in sync with the engine

1. **Single source of truth** — Add a small pure helper (e.g. `getDrumGrid16Event(grid16: number)` or `getDrumStepKind`) in [`patternSynth.ts`](src/utils/metronome/patternSynth.ts) (or a tiny `drumPatternGrid.ts` next to it) that encodes the **same** `if / else` branches as `playDrumPatternStepAt` but returns a label like `'none' | 'hihat' | 'kick' | 'snare' | 'snareHihat' | 'kickHihat'`.

2. **Hook** — In [`useAdvancedMetronome.ts`](src/hooks/metronome/useAdvancedMetronome.ts), when `beatSource === 'drums-pattern'`, for each `step` in `0..totalBeats-1` compute `grid16` the same way as in `scheduleNotes` and set **`stepDrumActivity`** (or a unified `StepPulseKind`) for the bar.

3. **Visualizer** — When `drums-pattern` and `stepDrumActivity` is present:
   - **`none`** (true silence): keep very dim fill (current rest-like / subdivision idle).
   - **Any event**: use a **colored** fill — at minimum distinguish from `none` (e.g. rotate `themedBeatPalette` by `floor(index / stepsPerBeat)` or by hit type: kick vs snare vs hat tints for clarity).
   - **Active** step: same lift/pulse as today, but do **not** force quarter-only “main beat” brights; follow activity.

4. **Optional (tier 2)** — Different tints: kick = `accentBase`, snare = `accentStrong`, hat-only = `muted` / `iconColor` (read from existing CSS theme vars in canvas).

5. **Pattern hint** — If [`BEAT_SOURCE_PATTERN_HINT['drums-pattern']`](src/components/metronome/AdvancedMetronome.tsx) does not match the real `playDrumPatternStepAt` map, regenerate the string (or a short `buildDrumPatternLabel()` for one source of truth).

## Strum / groove: D vs U (unchanged intent)

- Add **`stepStrumTokens`**: per-step `R | G | D | U` for guitar-strum + groove sources.
- **`--metro-pulse-down`**: your slate reference for **D**; **`--metro-pulse-up`**: second color for **U**; R/G as now.

## Out of scope

- Changing the drum *audio* pattern unless you explicitly want a different groove; this plan is **visual parity** with current audio.

## Verification

- 4/4 16th, **Syncopated groove**: every 16th that actually triggers audio should be visibly non-muted; silent slots match dots in the label.
- Strum / groove: D and U are visually distinct; R/G still clear.
