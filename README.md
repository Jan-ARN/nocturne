# Nocturne

Endless, generative, calm ambient soundscapes in the browser. Hit play and
procedural audio starts and never loops, while a slow generative visual drifts
along with it. No backend, no accounts, nothing to install.

**▶︎ Live: https://YOUR-GITHUB-USERNAME.github.io/nocturne/**

> Replace `YOUR-GITHUB-USERNAME` above once the GitHub Pages deploy is live.

## What it does

- **Press play** → an endless calm soundscape begins and keeps evolving.
- **Four moods** — Dusk, Rain, Deep Space, Forest — each with its own scale,
  voicing, and color palette.
- **Three macros** — Volume, Density (how busy it is), and Space (how much
  reverb and distance) — all responding live.
- A generative canvas of drifting light that pulses softly with each note.

Every note is quantized to a pentatonic-style scale over slow tempo, soft
attacks, and generous reverb, so the randomness always sounds intentional —
there is no wrong note.

## Stack

- [Vite](https://vitejs.dev/) + React + TypeScript
- [Tone.js](https://tonejs.github.io/) for the audio engine
- Plain Canvas 2D for the visual
- Vanilla CSS

## Run locally

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173/nocturne/` URL.

```bash
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
```

## Deploy

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the site and
publishes it to GitHub Pages on every push to `main`.

1. Push this repo to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` — the site goes live at
   `https://YOUR-GITHUB-USERNAME.github.io/nocturne/`.

The base path is `/nocturne/` (see `vite.config.ts`). If you host under a
different path, set the `VITE_BASE` env var at build time, e.g.
`VITE_BASE=/my-path/ npm run build`.

## License

[MIT](LICENSE) © Jan Arnemann
