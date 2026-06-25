export const SKILL_MD_FILENAME = 'SKILL.md'

export function generateSkillMd(): string {
  return `---
name: html-to-image
description: Convert a self-contained HTML/CSS/JS snippet into a marketing-ready PNG, JPG, WebP, AVIF, PDF, SVG, ICO, or animated GIF/APNG with PosterSnap. Use when turning an HTML/CSS mockup into an exportable poster, social post, print-ready PDF, favicon, or ad creative without opening a design tool.
---

# PosterSnap — HTML-to-Image Conversion Skill

## 1. Purpose
PosterSnap turns a self-contained HTML/CSS/JS snippet into a marketing-ready
image (PNG, JPG, WebP, AVIF, PDF, SVG, ICO, or animated GIF/APNG). Use it to
turn a quick visual mockup into an exportable poster, social post,
print-ready PDF, favicon, or ad creative without opening a design tool.

## 2. How to Provide HTML

### Paste mode
1. Open PosterSnap.
2. Paste your HTML into the editor on the left panel.
3. Click **Render** to preview it.

### Upload mode
1. Click **Upload .html** in the left panel.
2. Choose a \`.html\` or \`.htm\` file (max ~2MB).
3. The content loads into the editor and previews automatically.

### Exporting
1. Set the canvas **Width/Height** (or pick a size **Preset**) and choose a
   **Background** (transparent by default, or a solid color).
2. In the bottom bar, pick a **format** (PNG / JPG / WebP / AVIF / GIF /
   APNG / PDF / SVG / ICO) and click **Export**. The file downloads straight
   to your device. **Copy PNG** copies a PNG snapshot straight to the
   clipboard instead of downloading a file.

## 3. Supported Features
PosterSnap rasterizes by re-rendering your markup through the browser's own
engine (an SVG \`<foreignObject>\` snapshot), so the exported image matches the
live preview pixel-for-pixel — there is no separate CSS reimplementation to
fall out of sync with. In particular, modern CSS that older HTML-to-image
tools drop is fully supported:
- **Gradient / clipped text** — \`background-clip: text\` with
  \`-webkit-text-fill-color: transparent\` renders as actual gradient-colored
  letters (not a solid block behind the text).
- **\`filter\` and \`backdrop-filter\`** — blur, drop-shadow, frosted-glass
  panels, etc.
- **\`mix-blend-mode\` / \`background-blend-mode\`**, \`clip-path\`, \`mask\`,
  \`box-shadow\`, multi-layer gradients.
- Inline \`<style>\` blocks and inline \`style="..."\` attributes.
- Inline \`<script>\` blocks (executed inside a sandboxed preview iframe).
- CSS animations and transitions (captured by the GIF and APNG exporters).
- Web-safe fonts and \`@font-face\` declarations using embedded/base64 or
  publicly reachable (CORS-enabled) font URLs — fonts are auto-embedded into
  the export so they don't fall back to a system font.
- Background images and gradients. A transparent background is enabled by
  default and preserved in PNG exports; JPG always falls back to a solid
  background since it has no alpha channel.

### Not supported in MVP
- External images/fonts that are **not** CORS-enabled. Same-origin and
  CORS-enabled assets are fetched and inlined automatically; assets the
  browser refuses to read cross-origin render blank. Inline them as base64
  (or host them with permissive CORS) to be safe.
- Multi-page documents — only the first viewport-sized frame is captured.
- Video elements and WebGL/canvas-heavy animations in GIF/APNG export (frame
  capture works best with CSS/DOM animation).
- AVIF encoding depends on the browser's own \`canvas.toBlob\` support
  (recent Chrome/Firefox); unsupported browsers get an error toast instead
  of a silently wrong file.
- SVG export is not a vector trace of the artwork — it re-embeds the
  original HTML/CSS inside an SVG \`<foreignObject>\`, so it renders correctly
  in browsers but not in vector editors like Illustrator/Inkscape/Figma.

## 4. Best Practices
- Set an explicit \`width\`/\`height\` (or use a size preset) that matches your
  design instead of relying on the browser's default viewport.
- **Make the content fit the canvas — anything past the declared
  \`height\` is cropped.** The export captures exactly the \`width\` × \`height\`
  region; content that overflows is silently cut off (and \`justify-content:
  space-between\` on an overflowing column makes blocks overlap). Give the
  root element \`width\`/\`height\` equal to your canvas size, budget your font
  sizes/padding/gaps to fit, and confirm nothing is clipped in the preview
  before exporting. If a design feels cramped, reduce content or enlarge the
  canvas rather than letting it overflow.
- Avoid \`position: fixed\` relative to the browser window — use the document
  root element as your canvas instead.
- Inline critical CSS rather than linking external stylesheets, since
  cross-origin stylesheets can fail to load inside the sandboxed preview.
- For GIF/APNG export, FPS and duration are adjustable up to 60s; longer
  durations and higher FPS produce much larger files and slower exports,
  so keep animations as short as the design needs.
- **GIF/APNG capture a *window* of the timeline, not the settled poster.**
  Frames are sampled from a start offset over the chosen duration. A common
  mistake is building the design entirely from one-shot entrance animations
  (\`fade-in\`, \`slide-up\`, \`opacity: 0 -> 1\` with staggered delays): those
  start *blank* at t=0, so a capture from the start shows empty or
  half-revealed frames that look nothing like the preview (which you view
  after everything has settled). To get a good loop:
  - Prefer **looping** animations (\`animation: ... infinite\`) that look good
    at every moment, rather than play-once intros, for anything you want in
    the GIF.
  - PosterSnap's **Start at: Auto** (the default) auto-detects when one-shot
    entrance animations finish and begins capture there, so the GIF shows the
    settled design plus any looping motion. Set **Start at: Manual = 0s** if
    you specifically want to capture the intro reveal, or pick a later time to
    skip further in.
  - Make sure the \`duration\` covers a full loop of the motion you want.
- Test at 1x scale first, then bump to 2x/3x only for final high-res export.
- For ICO export, use a square canvas (equal width/height) — non-square
  canvases get stretched to fit each icon size.

## 5. Example HTML Template

\`\`\`html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        width: 1080px;
        height: 1080px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #6366f1, #ec4899);
        font-family: Arial, sans-serif;
      }
      .card {
        color: white;
        text-align: center;
      }
      .card h1 {
        font-size: 64px;
        margin: 0 0 12px;
      }
      .card p {
        font-size: 24px;
        opacity: 0.9;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Summer Sale</h1>
      <p>Up to 50% off — this weekend only</p>
    </div>
  </body>
</html>
\`\`\`

## 6. Export Tips
- **PNG**: best for designs needing transparency or crisp text/logos.
- **JPG**: smaller file size for photo-heavy posters; tune the quality
  slider to balance size vs. fidelity. No transparency support.
- **WebP**: usually smaller than PNG/JPG at similar quality, and keeps
  transparency — a good default for web use.
- **AVIF**: smaller still than WebP in most cases, but needs a recent
  Chrome/Firefox to encode; falls back to an error toast on older browsers.
- **PDF**: a single-page, pixel-accurate PDF sized to your canvas — useful
  for print-ready handoff or sharing a poster as a document.
- **GIF**: only worth using when your HTML actually animates (CSS keyframes,
  transitions, or JS-driven changes). Set FPS and duration (up to 60s) to
  match your animation's natural loop length, and use **Start at** to choose
  where capture begins (Auto skips one-shot entrance intros; see Best
  Practices). CSS animations are captured by deterministically seeking each
  frame, so even finite (non-looping) animations are captured correctly
  frame-by-frame instead of as a single frozen frame. GIF export is capped at
  2x scale (even if 3x is selected) to keep per-frame capture fast, and is
  limited to a 256-color palette.
- **APNG**: an animated PNG alternative to GIF using the same frame-by-frame
  capture — keeps full 8-bit alpha transparency and avoids GIF's color/
  dithering limits, at the cost of a larger file.
- **SVG**: embeds the original HTML/CSS inside an SVG \`<foreignObject>\` —
  scales crisply and reopens correctly in browsers, but not in vector
  editors (Illustrator/Inkscape/Figma).
- **ICO**: packs a 16/32/48/256px multi-resolution favicon from a square
  canvas; best for app icons and favicons rather than posters.
- **Copy PNG**: copies a PNG snapshot straight to the clipboard, for pasting
  into chat apps, docs, or design tools without a separate download step.
- Filenames follow the pattern \`postersnap_{timestamp}_{width}x{height}.{ext}\`.

## 7. Troubleshooting
- **"The HTML could not be parsed"** — check for unclosed tags or invalid
  markup; PosterSnap validates with the browser's own HTML parser.
- **Preview is blank** — open your browser console; scripts that throw on
  load will stop rendering. Remove or fix the failing script.
- **Export looks different from the preview** — fonts or cross-origin assets
  may not have finished loading before capture; wait for the preview to
  fully settle (1-2s) before exporting, or inline assets as base64.
- **GIF export is slow or large** — reduce duration/FPS or shrink the canvas
  size; frame-by-frame capture is CPU-intensive for big canvases.
`
}
