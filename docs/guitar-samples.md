# Guitar strum / mute / rest samples (optional asset path)

The app **defaults to Web Audio synthesis** for strum, palm-ghost, and **silence** for rests. If you want **real recorded** one-shots, download CC0 (or compatible) files and place them in [`public/samples/guitar/`](../public/samples/guitar/) (see the README there for filenames). A future `AudioBuffer` loader can decode them and play in place of synthesis.

## What to look for

| Role | Suggested content | In-app token |
|------|-------------------|-------------|
| Down strum | Chord strum, strings bright, downstroke | `D` |
| Up strum | Lighter, upstroke (often thinner) | `U` |
| Mute / ghost | Palm mute, choked strum, percussive “chk” (not full pitch) | `G` (ghost) |
| Rest / blank | *No file needed*—silence is just skipped | `R` |

## CC0 and open sources (verify license on each page before shipping)

- **Freesound — [Strum mute down (SpeedY)](https://freesound.org/people/SpeedY/sounds/8594/)**  
  Nylon, bar-chord style mute. **CC0** — good reference for a **palm / ghost** hit.

- **Freesound — [guitar strum (FenrirFangs)](https://freesound.org/s/234738/)**  
  Full chord strum (longer file); trim to ~100–200 ms for a **down** one-shot, or use only the attack.

- **Freesound — [Acoustic Guitar Strummed Loop (deadrobotmusic)](https://freesound.org/people/deadrobotmusic/sounds/628766/)**  
  **CC0** loop; slice single strums in an editor for **D/U** (not a substitute for a legal team—trim and normalize yourself).

- **OpenGameArt — [Guitar (CC0) single chord strum](https://opengameart.org/content/guitar-0)**  
  `guitar-1.wav` — very short, good **down** candidate.

- **Freesound** requires a **free account** to download the full `.wav` (previews are lower quality). Keep attribution notes if you use **CC-BY** sounds instead of CC0.

## Legal hygiene

- Prefer **CC0** for “drop in, no attribution” product builds.
- For **CC-BY**, add credits in your app or `ABOUT` screen and in `LICENSE-THIRD-PARTY` as your lawyer recommends.

## App-side patterns

Named patterns, feels, and step grids live in TypeScript: [`src/data/guitarStrumPatterns.ts`](../src/data/guitarStrumPatterns.ts). The metronome maps each bar to that grid using the current meter’s step count.
