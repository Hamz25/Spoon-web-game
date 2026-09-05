# 08 — Tilemaps, Levels & Camera

## Level data as JSON, not code

Levels are data. Keeping them as JSON (rather than hard-coded arrays in JS)
means you can add levels — or eventually build a level editor — without
touching engine or game logic.

```json
{
  "tileSize": 16,
  "width": 40,
  "height": 12,
  "tiles": [ 0,0,0,0, 1,1,1,1, 0,0, "...(width * height numbers total)" ],
  "tileTypes": { "0": "empty", "1": "ground", "2": "one-way-platform", "3": "hazard" },
  "entities": [
    { "type": "enemy_grump", "x": 200, "y": 160 },
    { "type": "pickup_coin", "x": 96,  "y": 128 }
  ],
  "playerStart": { "x": 32, "y": 128 },
  "bounds": { "width": 640, "height": 192 }
}
```

- `tiles` is the flat grid described in `04-data-structures-and-algorithms.md`.
- `tileTypes` maps numeric IDs to meaning — solid, passable, one-way, hazard.
- `entities` is a spawn list the `LevelLoader` walks through to instantiate
  real `Enemy`/`Pickup` objects at game start.

## LevelLoader

```js
// game/levels/LevelLoader.js
async function loadLevel(path, factories) {
  const data = await fetch(path).then(r => r.json());
  const tilemap = new Tilemap(data.width, data.height, data.tileSize, data.tiles);
  const entities = data.entities.map(e => factories[e.type](e.x, e.y));
  return { tilemap, entities, playerStart: data.playerStart, bounds: data.bounds };
}
```

`factories` is a lookup like `{ enemy_grump: (x, y) => new Enemy('grump', x, y), ... }`
— this keeps `LevelLoader` from needing to know about every entity type directly.

## Rendering only visible tiles (culling)

Never loop over the entire map every frame — only draw the columns/rows the
camera can currently see:

```js
function renderTilemap(ctx, tilemap, tileset, camera) {
  const startCol = Math.floor(camera.x / tilemap.tileSize);
  const endCol = startCol + Math.ceil(camera.viewWidth / tilemap.tileSize) + 1;
  const startRow = Math.floor(camera.y / tilemap.tileSize);
  const endRow = startRow + Math.ceil(camera.viewHeight / tilemap.tileSize) + 1;

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = tilemap.tileAt(col, row);
      if (tile === 0) continue;
      const screenX = col * tilemap.tileSize - camera.x;
      const screenY = row * tilemap.tileSize - camera.y;
      ctx.drawImage(tileset.image, ...tileset.rectFor(tile), screenX, screenY, tilemap.tileSize, tilemap.tileSize);
    }
  }
}
```

## Camera: follow + clamp

```js
// engine/render/Camera.js
class Camera {
  constructor(viewWidth, viewHeight) {
    this.x = 0; this.y = 0;
    this.viewWidth = viewWidth; this.viewHeight = viewHeight;
  }
  follow(target, levelBounds, smoothing = 0.1) {
    const desiredX = target.position.x - this.viewWidth / 2;
    const desiredY = target.position.y - this.viewHeight / 2;
    this.x += (desiredX - this.x) * smoothing;
    this.y += (desiredY - this.y) * smoothing;
    this.x = clamp(this.x, 0, Math.max(0, levelBounds.width - this.viewWidth));
    this.y = clamp(this.y, 0, Math.max(0, levelBounds.height - this.viewHeight));
  }
}
```

The `smoothing` factor is a lerp — the camera eases toward the player rather
than snapping instantly, which reads as much more polished on screen.

## Parallax backgrounds

Multiple background layers scroll at different fractions of the camera's
speed — farther layers move slower, giving an illusion of depth on flat 2D
art.

```js
function renderParallaxLayer(ctx, layerImage, camera, scrollFactor) {
  const offsetX = -(camera.x * scrollFactor) % layerImage.width;
  ctx.drawImage(layerImage, offsetX, 0);
  ctx.drawImage(layerImage, offsetX + layerImage.width, 0); // second copy for seamless wrap
}
// Typical factors: sky = 0.1, mountains = 0.3, trees = 0.6, foreground detail = 0.9
```

## One-way platforms and hazards via `tileTypes`

Rather than hardcoding tile ID `2` as "platform" throughout your code, look
up behavior by the level's own `tileTypes` map, so different tilesets can
reuse the same engine code:

```js
function isSolid(tilemap, col, row) {
  const type = tilemap.tileTypes[tilemap.tileAt(col, row)];
  return type === 'ground';
}
function isHazard(tilemap, col, row) {
  return tilemap.tileTypes[tilemap.tileAt(col, row)] === 'hazard';
}
```

## Optional: using Tiled instead of hand-written JSON

[Tiled](https://www.mapeditor.org/) is a free, popular map editor that
exports JSON in a well-documented format. For anything beyond a couple of
small hand-crafted levels, painting tiles visually beats hand-editing a
numeric array. If you adopt it, `LevelLoader` just needs a translation step
from Tiled's JSON shape into your `Tilemap`/`entities` shape above — the rest
of the engine doesn't change.

## Checklist

- [ ] Levels live in `.json` files, not hardcoded in JS.
- [ ] Rendering only draws tiles currently inside the camera viewport.
- [ ] The camera follows the player with easing and is clamped to level bounds.
- [ ] Background layers scroll at different speeds for parallax depth.
- [ ] Tile *behavior* (solid/hazard/one-way) is looked up from data, not hardcoded IDs sprinkled through the code.

Next: `09-sprite-editor-tool.md`.
