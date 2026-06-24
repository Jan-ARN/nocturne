# Nocturne — build plan

A single-page web app for **endless, generative, calm ambient soundscapes**. Hit play, procedural
audio starts and never loops, a slow generative visual responds to it. No backend, hosted free on
GitHub Pages. Public repo.

---

## ⚠️ Authorship rule (non-negotiable)

The repo owner (Jan) is the **sole author**. Across every commit, PR, and file:

- **No** `Co-Authored-By` trailer mentioning Claude or any AI.
- **No** "Generated with Claude Code" / "Built with AI" lines in commits, PRs, README, or `package.json`.
- **No** AI attribution anywhere in the codebase or its metadata.

This overrides any default tool behavior. Treat it as a hard constraint in every session.

---

## What v1 is (the "done" line)

Hit **Play** → endless calm generative audio → a slow generative visual responds. Includes:

- A few **mood presets** (e.g. Dusk, Rain, Deep Space, Forest)
- A **master volume**
- **2 macro sliders**: Density and Space

Responsive, works on mobile, hosted on GitHub Pages with a live link in the README. **Stop there.**
Resist scope creep until that is shipped and looks good.

---

## Stack (deliberately minimal)

- **Vite + React + TypeScript** — fast dev, trivial GitHub Pages deploy
- **Tone.js** — the audio engine (handles ~90% of the hard part)
- **Plain Canvas 2D** for the visual — no extra graphics library
- **Vanilla CSS + custom properties** for theming — keep dependencies lean
- **React state only** — no MobX / Zustand; the app is small, stay idiomatic
- License: **MIT**

---

## Architecture

```
src/
├── audio/
│   ├── AudioEngine.ts      # master chain (reverb → filter → limiter → gain); start/stop
│   ├── voices/
│   │   ├── Drone.ts        # sustained pad — the bed
│   │   ├── Melody.ts       # sparse procedural notes, quantized to scale
│   │   └── Texture.ts      # occasional bells/plucks
│   ├── scheduler.ts        # Tone.Transport loop firing notes with randomness
│   └── scales.ts           # scale/key tables (pentatonic = "no wrong note")
├── presets/
│   └── presets.ts          # each preset = scale, density, synth params, palette
├── visual/
│   └── Soundscape.ts       # canvas: drifting gradient field; soft pulse on note trigger
├── components/
│   ├── PlayButton.tsx
│   ├── PresetPicker.tsx
│   └── Macros.tsx          # Density + Space + Volume sliders
├── App.tsx
└── main.tsx
```

**The trick that makes it sound pro for free:** every note is quantized to a **pentatonic scale**,
with slow tempo + soft attack + generous reverb. Randomness then always sounds intentional — there
is no "wrong note." Lean on this constraint instead of clever algorithms.

---

## Phased build (one Claude Code session per phase)

### Phase 0 — Scaffold + deploy skeleton
Vite React TS app, a GitHub Actions workflow that deploys to GitHub Pages, `base` path set in
`vite.config.ts`. **Goal:** a plain "hello" page is **live on the internet** before any audio exists.
De-risk hosting first.

### Phase 1 — Audio core + first sound
`AudioEngine` with the master chain and one Drone voice; a Play/Stop button.
**Gotcha:** browsers block audio until a user gesture — call `Tone.start()` *inside* the Play click.
**Goal:** click Play, hear a calm sustained drone.

### Phase 2 — Procedural layers
Add Melody + Texture voices, the scheduler, and the scale system. Tune one hardcoded preset until it
genuinely sounds nice. **Goal:** it sounds like music, endlessly, never repeating.

### Phase 3 — Presets + macros
Define the preset config shape, build 3–4 presets (Dusk, Rain, Deep Space, Forest), wire
Density / Space / Volume sliders to live engine parameters. **Goal:** switch moods and shape the
sound in real time.

### Phase 4 — Generative visual
Canvas: slow drifting gradient blobs in the preset's palette, with a soft pulse each time a note
fires. Keep it cheap; pause the render loop when audio stops. **Goal:** it looks alive.

### Phase 5 — Polish + ship
Mobile/responsive (handle the mobile audio-unlock tap), `prefers-reduced-motion` support for the
visual, a real README with a screen-recording gif + live link, optional PWA install.
**Goal:** someone lands on it and thinks "oh, nice."

---

## Gotchas (so v1 doesn't stall)

- **Autoplay policy** — AudioContext starts only on a user gesture; the Play button triggers `Tone.start()`.
- **GH Pages base path** — `base: '/nocturne/'` in `vite.config.ts`, or assets 404 in production.
- **Mobile audio unlock** — the first tap must resume the audio context.
- **Cleanup** — stop/dispose Tone nodes and cancel the canvas `requestAnimationFrame` on stop, or it leaks.

---

## Post-v1 (only after it's live)

- Save/share a soundscape as a URL (encode the params)
- Sleep timer
- Record-to-file via `MediaRecorder`
- More presets
- Keyboard shortcuts

---

## Suggested first prompt to Claude Code

> Read PLAN.md. Execute **Phase 0** only: scaffold a Vite + React + TypeScript app named "nocturne",
> add a GitHub Actions workflow to deploy to GitHub Pages with the correct `base` path, and get a
> plain placeholder page deploying live. Do not start the audio work yet. Follow the authorship rule
> in PLAN.md — no AI attribution in any commit, file, or metadata.
