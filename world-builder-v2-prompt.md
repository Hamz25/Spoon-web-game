# Prompt: Extend the World Builder (undo, zoom, real entities)

I have a single-file HTML level painter (`world-builder.html`) for a 2D
platformer. It currently paints tile ids onto a grid, assigns each id a
category (`ground`/`shape`/`hazard`) into `tileTypes`, and exports JSON
matching my `Tilemap`/`LevelLoader` schema:
`{ tileSize, width, height, tiles, tileTypes, entities, playerStart, bounds }`.

I want to extend it with three things: **undo/redo**, **zoom**, and a
**real entity palette** that matches my actual entity classes instead of
free-text entity types. Requirements below.

## 1. Undo / Redo

- Maintain a history stack of **strokes**, not individual cells — a whole
  click-drag paint/erase gesture (mousedown → mousemove× N → mouseup) should
  undo as ONE step, not one step per cell touched. Record each stroke as a
  list of `{col, row, prevId, newId}` so undo can restore prior values and
  redo can reapply them.
- `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) for undo/redo, plus visible buttons.
- Also cover: entity add/delete, and player-start moves, in the same stack
  (so the whole editing session is one linear undo history, not two
  separate histories for tiles vs. entities).
- Cap history length (e.g. 200 entries) so it doesn't grow unbounded on a
  long session — drop the oldest entry once the cap is hit.

## 2. Zoom

- Add a zoom control (slider or `+`/`-` buttons, plus ctrl+scrollwheel over
  the canvas) that scales the on-screen tile size (currently a fixed 16px)
  between roughly 6px and 32px.
- Zooming must NOT change the underlying tile grid or exported coordinates
  — it only changes `DISP` (the on-screen pixel size per tile). Recompute
  canvas width/height and re-render on every zoom change.
- Keep the palette swatch size independent of canvas zoom (it doesn't need
  to zoom).

## 3. Real entity palette (replace the free-text type field)

Base the entity list on my actual entity constructors, not arbitrary
strings. Here's what each one needs, read directly from my source files:

- **Cat** (`Cat.js`) — just needs `x, y`. No extra fields.
- **Chest** (`Chest.js`) — constructor is
  `(x, y, message, grantsItem = null, closedTileId = 10, openTileId = 12)`.
  When placing one, the builder should prompt for:
  - `message` (text, defaults to `"You found a little surprise!"`)
  - `grantsItem` (optional text, defaults to empty/null — e.g. `"firework"`)
  - `closedTileId` / `openTileId` (numeric, default 10 / 12 — these are
    tileset ids, so ideally let me pick them from the same palette grid
    the tile brush uses, not just type a number blind)
- **MessageZone** (`MessageZone.js`) — constructor is
  `(x, y, message, width = 32, height = 32)`. Prompt for `message`, and
  optionally width/height (default 32×32). Render its trigger area as a
  translucent rectangle in that size, not a single tile square, since it's
  an invisible trigger zone, not a sprite.
- **Firework** — do NOT add this to the placeable entity list. It's only
  ever spawned at runtime by `PlayScene` (from an inventory item), never
  placed in level JSON. Leave it out entirely.
- **Enemy / Pickup / Projectile** — these files are currently empty in my
  project (no implementation yet). Structure the entity palette so a new
  type can be added later by extending one array/config object, rather
  than hardcoding a fixed switch statement — but don't build placeholder
  UI for them now since I don't know their fields yet.

For each entity dropped on the canvas, store whatever fields it actually
needs (message/grantsItem/tile ids/width/height) alongside `type, x, y` in
the exported `entities` array, and show these fields in the entity list
sidebar so I can edit them after placing (not just delete/re-place).

## 4. Player start (keep as-is)

Already implemented correctly — single point, exported as `playerStart`.
No changes needed other than making sure it participates in undo (see #1).

## 5. Checkpoint — placeholder only, flag the limitation

I want a "Checkpoint" placement tool for future use, but **there is no
checkpoint system in the engine yet** — `Player.js` currently reads
`world.respawnPoint`, which `Game.js` just hardcodes to the level's
`playerStart`. So:

- Add a `checkpoint` entity type to the palette (icon/marker distinct from
  other entities), exported into `entities` as `{ type: "checkpoint", x, y }`.
- Do NOT invent or imply any runtime behavior for it — it's inert data
  until an actual checkpoint system exists in `Player.js`/`Game.js`. Say
  so in a short comment/tooltip in the tool itself, so future-me doesn't
  assume it already works.

## Constraints to preserve

- Keep it a single self-contained HTML file (no build step, no server
  required) — same as the current version, so `npx serve` or a plain
  double-click still works.
- Keep Import/Export compatible with the existing level JSON schema —
  don't add new top-level fields without a clear reason.
- Keep the tileset image embedded as base64, not fetched externally.
