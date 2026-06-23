# PosterSnap

Convert HTML/CSS/JS snippets into marketing-ready PNG, JPG, PDF, or GIF
assets — entirely in the browser, no backend required.

## Features

- Paste or upload a self-contained HTML snippet and preview it live in a
  sandboxed iframe.
- Size presets (Instagram Post/Story, LinkedIn Post, A4 Poster) or custom
  width/height.
- 1x/2x/3x export resolution, solid or transparent background, JPG quality
  slider, GIF fps/duration controls (up to 60s).
- One-click "Download Skill MD" — a markdown guide explaining how to write
  HTML that converts well.
- Ships as a static site: deploy to GitHub Pages or Cloudflare Pages with no
  server component.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL, paste some HTML in the left panel, click
**Render**, then **Export**.

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

## How export works

The preview renders inside a sandboxed `<iframe sandbox="allow-scripts
allow-same-origin">` using `srcdoc`. Export captures that iframe's DOM with
[html2canvas](https://github.com/niklasvb/html2canvas). PNG/JPG are a single
capture; PDF wraps a single capture in a pixel-sized page via
[jsPDF](https://github.com/parallax/jsPDF).

GIF export restarts the iframe's document (`document.open/write/close`, since
`location.reload()` is a no-op for `srcdoc` iframes) so finite animations
play from the start, then repeatedly captures frames over the chosen
duration/fps and encodes them with
[gif.js](https://github.com/jnordberg/gif.js) (its web worker script is
vendored at `public/gif.worker.js`). html2canvas itself zeroes out
`animation-duration` on any actively-animating element it captures (to get a
stable read), which — combined with `animation-fill-mode: forwards` — would
otherwise snap every frame straight to the animation's end state. To avoid
that, each CSS animation is permanently disabled (`animation: none`) for the
duration of the export and re-created as an independent Web Animations API
`Animation` using the same keyframes/timing, fully detached from the CSS
`animation` property. That detached animation is seeked to the exact frame
time via `currentTime` before each capture — html2canvas never sees a
non-zero `animation-duration` to neutralize, and nothing else is fighting
over the animation's state between frames.

## Tech stack

React + TypeScript + Vite, Tailwind CSS v4, Zustand for state, html2canvas,
jsPDF, and gif.js for export.

## License

MIT — see [LICENSE](LICENSE).
