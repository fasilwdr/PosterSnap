export const SKILL_MD_FILENAME = 'html-conversion-skill.md'

export function generateSkillMd(): string {
  return `# PosterSnap — HTML-to-Image Conversion Skill

## 1. Purpose
PosterSnap turns a self-contained HTML/CSS/JS snippet into a marketing-ready
image (PNG, JPG, PDF, or animated GIF). Use it to turn a quick visual mockup
into an exportable poster, social post, print-ready PDF, or ad creative
without opening a design tool.

## 2. How to Provide HTML

### Paste mode
1. Open PosterSnap.
2. Paste your HTML into the editor on the left panel.
3. Click **Render** to preview it.

### Upload mode
1. Click **Upload HTML file** in the left panel.
2. Choose a \`.html\` or \`.htm\` file (max ~2MB).
3. The content loads into the editor and previews automatically.

## 3. Supported Features
- Inline \`<style>\` blocks and inline \`style="..."\` attributes.
- Inline \`<script>\` blocks (executed inside a sandboxed preview iframe).
- CSS animations and transitions (captured by the GIF exporter).
- Web-safe fonts and \`@font-face\` declarations using embedded/base64 or
  publicly reachable font URLs.
- Background images and gradients, including \`background: transparent\`
  when exporting to PNG with transparency enabled.

### Not supported in MVP
- External resources blocked by CORS (cross-origin images/fonts may render
  blank in the exported image even if they preview correctly).
- Multi-page documents — only the first viewport-sized frame is captured.
- Video elements and WebGL/canvas-heavy animations in GIF export (frame
  capture works best with CSS/DOM animation).

## 4. Best Practices
- Set an explicit \`width\`/\`height\` (or use a size preset) that matches your
  design instead of relying on the browser's default viewport.
- Avoid \`position: fixed\` relative to the browser window — use the document
  root element as your canvas instead.
- Inline critical CSS rather than linking external stylesheets, since
  cross-origin stylesheets can fail to load inside the sandboxed preview.
- For GIF export, FPS and duration are adjustable up to 60s; longer
  durations and higher FPS produce much larger files and slower exports,
  so keep animations as short as the design needs.
- Test at 1x scale first, then bump to 2x/3x only for final high-res export.

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
  slider to balance size vs. fidelity.
- **PDF**: a single-page, pixel-accurate PDF sized to your canvas — useful
  for print-ready handoff or sharing a poster as a document.
- **GIF**: only worth using when your HTML actually animates (CSS keyframes,
  transitions, or JS-driven changes). Set FPS and duration (up to 60s) to
  match your animation's natural loop length. CSS animations are captured
  by deterministically seeking each frame, so even finite (non-looping)
  animations are captured correctly frame-by-frame instead of as a single
  frozen frame.
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
