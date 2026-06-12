# Kitchen Colors

A zero-build cabinet color visualizer hosted on GitHub Pages. Pick finishes for upper cabinets, lower cabinets, and pulls — the photo repaints itself in real time.

## Running locally

```bash
python3 -m http.server 7823
# open http://localhost:7823
```

No build step, no dependencies, no Node required.

## Project structure

```
index.html          HTML skeleton only — no inline styles or scripts
styles/
  base.css          resets, body, h1, typography
  layout.css        page grid and flex containers
  components.css    all discrete UI components (buttons, cards, swatches, forms)
scripts/
  app.js            entry point — restores persisted state, triggers first load
  state.js          shared mutable state object (st), constants, all DOM refs
  data.js           ANGLES, default palettes, localStorage/IndexedDB helpers, loadImg
  compose.js        pixel-level color math — applyMask, textures, composeBase, buildOverlay
  render.js         loadAngle, repaint loop, loupe magnifier
  masks.js          polygon draw/erase, brush erase, undo, downloadMask
  events.js         all canvas pointer/keyboard and toolbar button listeners
  palette.js        savePalettes, addColor, deleteColor, select
  panels.js         renderAngleTabs, renderRightPanel
  controls.js       renderUI and all edit-mode control renderers
masks/
  gen1/  gen2/  gen3/    per-angle upper.png, lower.png, pulls.png alpha masks
textures/                wood-grain and finish texture JPGs
uploads/                 source kitchen photos
```

All JS files use ES modules (`type="module"`). No globals. Each file is under 300 lines.

## How it works

1. **Masks** — each cabinet region (uppers, lowers, pulls) has a grayscale PNG mask per angle. White = fully painted, black = untouched.
2. **Color application** — `composeBase` reads the base photo pixels, applies the selected hex color weighted by luminance-ratio, then blends a tileable texture on top using soft-light.
3. **Persistence** — palette edits and color selections go to `localStorage`. Custom photos go to IndexedDB. Mask edits are serialized as data-URL PNGs in `localStorage`.
4. **Mask editor** — polygon draw tool (click corners, Enter/click first point to close), polygon erase tool, and a circular brush eraser. Includes a 3× loupe magnifier for precision.

## Adding a new kitchen angle

1. Drop the photo in `uploads/`.
2. Create a mask directory `masks/genN/` with `upper.png`, `lower.png`, `pulls.png` (grayscale, same resolution as the photo).
3. Add an entry to the `ANGLES` array in `scripts/data.js`.

## Deploying to GitHub Pages

Push to the `main` branch. In repo Settings → Pages, set source to **Deploy from branch → main → / (root)**. No build action needed.
