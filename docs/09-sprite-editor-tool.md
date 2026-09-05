# 09 — Building Your Own Pixel-Art Sprite Editor

This is a small, standalone web app you build to create the character,
enemy, and tile art for your game — original art, so the finished game is
genuinely yours. It exports files in exactly the format `06-animation-system.md`
expects.

## What it needs to do (scope)

A minimal but genuinely useful pixel-art editor needs:

1. A fixed-size pixel grid you draw on (e.g. 16×16 or 32×32).
2. A few tools: pencil, eraser, paint bucket (flood fill), eyedropper.
3. A color palette (a handful of preset swatches + a custom color picker).
4. Multiple **frames** (for animation) with a thumbnail strip.
5. Undo/redo.
6. Export to PNG (single sprite or a combined sprite sheet) + a JSON metadata
   file describing frame rects — the format `06-animation-system.md` defines.

That's a complete, real tool — resist scope-creeping into layers, brushes,
or gradients until the basics work end to end.

## Data model: the pixel grid

The whole editor centers on one data structure: a 2D grid where each cell
holds a color (or `null` for transparent).

```js
// tools/sprite-editor/src/PixelGrid.js
class PixelGrid {
  constructor(width, height) {
    this.width = width; this.height = height;
    this.cells = new Array(width * height).fill(null); // null = transparent
  }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  get(x, y) { return this.inBounds(x, y) ? this.cells[y * this.width + x] : null; }
  set(x, y, color) { if (this.inBounds(x, y)) this.cells[y * this.width + x] = color; }
  clone() { const g = new PixelGrid(this.width, this.height); g.cells = [...this.cells]; return g; }
}
```

## Rendering the grid to canvas

Draw each cell as a scaled-up rectangle so a 16×16 sprite is comfortably
editable at, say, 20 screen-pixels per cell:

```js
// tools/sprite-editor/src/PixelCanvas.js
function renderGrid(ctx, grid, pixelSize, showGridLines = true) {
  ctx.clearRect(0, 0, grid.width * pixelSize, grid.height * pixelSize);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const color = grid.get(x, y);
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  if (showGridLines) drawGridLines(ctx, grid, pixelSize);
}

function drawGridLines(ctx, grid, pixelSize) {
  ctx.strokeStyle = 'rgba(128,128,128,0.3)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= grid.width; x++) {
    ctx.beginPath(); ctx.moveTo(x * pixelSize, 0); ctx.lineTo(x * pixelSize, grid.height * pixelSize); ctx.stroke();
  }
  for (let y = 0; y <= grid.height; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * pixelSize); ctx.lineTo(grid.width * pixelSize, y * pixelSize); ctx.stroke();
  }
}
```

Converting a mouse/touch click into a grid cell is the inverse operation:

```js
function screenToCell(event, canvas, pixelSize) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / pixelSize);
  const y = Math.floor((event.clientY - rect.top) / pixelSize);
  return { x, y };
}
```

## Tools as a Strategy pattern

Each tool implements the same tiny interface, so the canvas doesn't need to
know which tool is active — it just forwards events to whichever one is
selected:

```js
// tools/sprite-editor/src/tools/PencilTool.js
export const PencilTool = {
  onPointerDown(grid, x, y, color) { grid.set(x, y, color); },
  onPointerDrag(grid, x, y, color) { grid.set(x, y, color); },
  onPointerUp() {},
};

// tools/sprite-editor/src/tools/EraserTool.js
export const EraserTool = {
  onPointerDown(grid, x, y) { grid.set(x, y, null); },
  onPointerDrag(grid, x, y) { grid.set(x, y, null); },
  onPointerUp() {},
};

// tools/sprite-editor/src/tools/BucketFillTool.js
export const BucketFillTool = {
  onPointerDown(grid, x, y, color) { floodFill(grid, x, y, color); }, // see 04-data-structures-and-algorithms.md
  onPointerDrag() {},
  onPointerUp() {},
};

// tools/sprite-editor/src/tools/EyedropperTool.js
export const EyedropperTool = {
  onPointerDown(grid, x, y, _color, editor) { editor.setActiveColor(grid.get(x, y)); },
  onPointerDrag() {},
  onPointerUp() {},
};
```

The app just holds `activeTool` and forwards pointer events:

```js
canvas.addEventListener('pointerdown', e => {
  const { x, y } = screenToCell(e, canvas, pixelSize);
  activeTool.onPointerDown(grid, x, y, activeColor, editor);
  history.push(grid.clone());
  render();
});
```

## Undo/redo

Reuse the `HistoryStack` (Memento pattern) from
`04-data-structures-and-algorithms.md`:

```js
const history = new HistoryStack();
let grid = new PixelGrid(16, 16);

function commit() { history.push(grid.clone()); }
function undo() { grid = history.undo(grid.clone()); render(); }
function redo() { grid = history.redo(grid.clone()); render(); }

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'z') undo();
  if (e.ctrlKey && e.key === 'y') redo();
});
```

## Multiple frames for animation + onion skinning

Store an array of `PixelGrid`s — one per animation frame — plus a "current
frame" index. **Onion skinning** draws the *previous* frame at low opacity
underneath the current one, so you can see where things were for smooth
motion:

```js
class FrameStrip {
  constructor(width, height) {
    this.frames = [new PixelGrid(width, height)];
    this.current = 0;
  }
  addFrame() { this.frames.push(this.frames[this.current].clone()); this.current = this.frames.length - 1; }
  currentGrid() { return this.frames[this.current]; }
}

function renderOnionSkin(ctx, frameStrip, pixelSize) {
  if (frameStrip.current > 0) {
    ctx.globalAlpha = 0.25;
    renderGrid(ctx, frameStrip.frames[frameStrip.current - 1], pixelSize, false);
    ctx.globalAlpha = 1;
  }
  renderGrid(ctx, frameStrip.currentGrid(), pixelSize);
}
```

## Exporting — the important part

This has to output exactly what `SpriteSheet`/`Animator` in
`06-animation-system.md` expect: one combined PNG plus a JSON file.

```js
// tools/sprite-editor/src/Exporter.js
function exportSpriteSheet(frameStrip, pixelSize) {
  const frameW = frameStrip.frames[0].width;
  const frameH = frameStrip.frames[0].height;

  // 1. Composite every frame side-by-side onto one offscreen canvas
  const sheet = document.createElement('canvas');
  sheet.width = frameW * frameStrip.frames.length;
  sheet.height = frameH;
  const ctx = sheet.getContext('2d');
  frameStrip.frames.forEach((grid, i) => {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const color = grid.get(x, y);
        if (color) { ctx.fillStyle = color; ctx.fillRect(i * frameW + x, y, 1, 1); }
      }
    }
  });

  // 2. Build the metadata JSON (matches 06-animation-system.md's format)
  const meta = {
    imageWidth: sheet.width,
    imageHeight: sheet.height,
    frameSize: { w: frameW, h: frameH },
    frames: frameStrip.frames.map((_, i) => ({ x: i * frameW, y: 0, w: frameW, h: frameH })),
    clips: { idle: { frames: [0], frameDuration: 1, loop: true } }, // edit clips as needed
  };

  // 3. Trigger downloads
  downloadDataURL(sheet.toDataURL('image/png'), 'sprite.png');
  downloadText(JSON.stringify(meta, null, 2), 'sprite.json');
}

function downloadDataURL(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename; a.click();
}
function downloadText(text, filename) {
  downloadDataURL('data:application/json,' + encodeURIComponent(text), filename);
}
```

Note the composite loop draws pixel-by-pixel (`fillRect(..., 1, 1)`) onto a
1:1 scale canvas — the *editing* canvas is scaled up for usability, but the
*exported* PNG should be actual-size pixel art (e.g. 16×16 per frame), which
the game then scales up at render time via `image-rendering: pixelated`.

## Minimal HTML shell

```html
<!-- tools/sprite-editor/index.html -->
<!doctype html>
<html>
<head><meta charset="UTF-8"><title>Sprite Editor</title><link rel="stylesheet" href="style.css"></head>
<body>
  <div id="toolbar">
    <button data-tool="pencil">Pencil</button>
    <button data-tool="eraser">Eraser</button>
    <button data-tool="bucket">Bucket</button>
    <button data-tool="eyedropper">Eyedropper</button>
    <input type="color" id="colorPicker" />
    <button id="undoBtn">Undo</button>
    <button id="redoBtn">Redo</button>
    <button id="addFrameBtn">+ Frame</button>
    <button id="exportBtn">Export</button>
  </div>
  <canvas id="editor" width="320" height="320"></canvas>
  <div id="frameStrip"></div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

## Suggested build order

1. Render an empty grid + pencil tool that sets one cell's color on click.
2. Add a color picker and eraser.
3. Add undo/redo.
4. Add the bucket-fill tool.
5. Add multiple frames + a thumbnail strip.
6. Add onion skinning.
7. Add export (PNG first, then the JSON metadata alongside it).
8. Load your exported files straight into the game's `AssetLoader` and
   confirm the animation plays — this closes the loop between the two tools.

## Stretch ideas (see `12-extending-the-game.md` for more)

- Mirror/symmetry drawing mode (great for symmetric characters).
- Import a reference image at reduced opacity to trace over.
- Named/reorderable palettes saved to `localStorage`.
- Multiple layers with visibility toggles.

Next: `10-step-by-step-tutorial.md`.
