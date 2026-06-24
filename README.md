# PosterSnap

Convert HTML/CSS/JS snippets into marketing-ready PNG, JPG, WebP, AVIF, PDF,
SVG, ICO, or animated GIF/APNG assets — entirely in the browser, no backend
required.

## Features

- Paste or upload a self-contained HTML snippet and preview it live in a
  sandboxed iframe.
- Size presets (Instagram Post/Story, LinkedIn Post, A4 Poster) or custom
  width/height.
- 1x/2x/3x export resolution, solid or transparent background, an image
  quality slider (JPG/WebP/AVIF), and animation fps/duration controls
  (GIF/APNG, up to 60s).
- Export to PNG, JPG, WebP, AVIF, PDF, SVG (HTML embedded in a
  `<foreignObject>`), ICO (multi-resolution favicon), or animated GIF/APNG —
  plus a one-click "Copy PNG" to clipboard.
- One-click "Download Skill MD" — a markdown guide explaining how to write
  HTML that converts well.
- Ships as a static site: deploy to GitHub Pages or Cloudflare Pages with no
  server component, aside from one fire-and-forget usage-counter request per
  export (see below).

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
[html2canvas](https://github.com/niklasvb/html2canvas). PNG/JPG/WebP/AVIF are
a single capture via `canvas.toBlob`; PDF wraps a single capture in a
pixel-sized page via [jsPDF](https://github.com/parallax/jsPDF); ICO resizes
that single capture into a 16/32/48/256px multi-resolution favicon; SVG skips
html2canvas entirely and re-embeds the iframe's live, serialized DOM inside
an SVG `<foreignObject>` (not a vector trace — renders in browsers, not in
vector editors).

GIF and APNG export restart the iframe's document
(`document.open/write/close`, since `location.reload()` is a no-op for
`srcdoc` iframes) so finite animations play from the start, then repeatedly
capture frames over the chosen duration/fps. GIF frames are encoded with
[gif.js](https://github.com/jnordberg/gif.js) (its web worker script is
vendored at `public/gif.worker.js`); APNG frames are encoded with
[UPNG.js](https://github.com/photopea/UPNG.js), trading GIF's 256-color/no
real-alpha limits for true 8-bit alpha at a larger file size. Both share the
same animation-seeking rig: html2canvas itself zeroes out
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

## Usage tracking

A running total export count is kept via
[Abacus](https://v2.jasoncameron.dev/abacus) and shown live in the header
badge ("N exports"). On load, the header does a `GET` to
`https://abacus.jasoncameron.dev/get/fasilwdr-postersnap/exports-total` to
seed the badge; every successful export then fires a `GET` to
`https://abacus.jasoncameron.dev/hit/fasilwdr-postersnap/exports-total` (see
`src/lib/analytics.ts`) and updates the badge from the response. Neither
request sends any HTML/image content, and failures (offline, rate-limited)
just leave the badge as-is instead of blocking the export.

## Tech stack

React + TypeScript + Vite, Tailwind CSS v4, Zustand for state, html2canvas,
jsPDF, gif.js, and UPNG.js for export.

## License

MIT — see [LICENSE](LICENSE).
