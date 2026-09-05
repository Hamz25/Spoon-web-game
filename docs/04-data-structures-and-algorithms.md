# 04 — Data Structures & Algorithms

A platformer looks simple on screen but leans on a specific, well-understood
set of data structures and algorithms. Here's every one you'll actually use,
why, and its complexity.

## Vector2 — the atomic data structure

Nearly everything (position, velocity, acceleration) is a 2D vector.

```js
class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
  scale(s) { return new Vector2(this.x * s, this.y * s); }
  static lerp(a, b, t) {
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}
```

## AABB (Axis-Aligned Bounding Box) — collision primitive

Every solid thing (player, enemy, tile, projectile) is approximated as an
upright rectangle for collision purposes — far cheaper than pixel-perfect
collision and visually indistinguishable for this genre.

```js
function intersects(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
```
**Complexity:** O(1) per pair.

## Tilemap — 2D grid

A level is stored as a flat array indexed like a 2D grid (faster and more
cache-friendly than an array-of-arrays):

```js
class Tilemap {
  constructor(width, height, tileSize, tiles) {
    this.width = width; this.height = height; this.tileSize = tileSize;
    this.tiles = tiles; // Uint8Array or plain Array, length = width * height
  }
  tileAt(col, row) {
    if (col < 0 || row < 0 || col >= this.width || row >= this.height) return 0;
    return this.tiles[row * this.width + col];
  }
  tileAtWorldPos(x, y) {
    return this.tileAt(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }
}
```
**Complexity:** O(1) lookup by coordinate — this is why grids beat lists of
"placed tile" objects for level geometry.

## Broad-phase vs. narrow-phase collision

- **Narrow-phase**: the exact AABB test above, run on a *specific* pair.
- **Broad-phase**: deciding *which* pairs are even worth testing, so you're
  not comparing every entity against every other entity every frame.

| Approach | Complexity | When to use |
|---|---|---|
| Naive (test everything against everything) | O(n²) | Fine up to a few dozen entities — most platformer levels never exceed this. Start here. |
| Spatial grid (bucket entities into fixed-size cells, only test entities sharing a cell) | ~O(n) average | If you have many enemies/bullets on screen at once and profiling shows collision is a bottleneck. |
| Quadtree (recursively subdivide space) | O(n log n) build, fast queries | Larger/denser worlds. Overkill for a first Mario-style game — mention it so you know it exists. |

**Recommendation:** start naive. A Mario-style level rarely has more than
~30–50 active entities at once; O(n²) on 50 entities is 2,500 checks, trivial
for a modern browser at 60fps. Only reach for a spatial grid if profiling
(see `11-testing-performance-deployment.md`) tells you to.

## Tile collision resolution algorithm (separate-axis)

This is the core physics algorithm of the whole game. Moving X and Y
*separately* (rather than diagonally in one step) avoids getting stuck in
corners and makes sliding along walls/floors trivial.

```
function moveAndCollide(entity, tilemap, dt):
    # --- X axis ---
    entity.position.x += entity.velocity.x * dt
    for each solid tile overlapping entity's new box:
        if entity.velocity.x > 0:  entity.position.x = tile.left - entity.width
        if entity.velocity.x < 0:  entity.position.x = tile.right
        entity.velocity.x = 0

    # --- Y axis ---
    entity.position.y += entity.velocity.y * dt
    for each solid tile overlapping entity's new box:
        if entity.velocity.y > 0:  # falling onto a tile
            entity.position.y = tile.top - entity.height
            entity.grounded = true
        if entity.velocity.y < 0:  # hitting a ceiling
            entity.position.y = tile.bottom
        entity.velocity.y = 0
```
**Complexity:** O(k) per entity per frame, where k = number of tiles near the
entity (typically look up only the handful of tiles the entity's box
overlaps — not the whole map).

## Finite State Machine (FSM) — as a data structure

A state machine is just a map from state name → behavior + transitions. This
makes it a genuine data structure you can inspect, serialize, or visualize —
not just a pile of `if` statements.

```js
class FiniteStateMachine {
  constructor(initial) {
    this.states = new Map();   // name -> { onEnter, onUpdate, onExit }
    this.current = initial;
  }
  add(name, state) { this.states.set(name, state); }
  transition(name) {
    this.states.get(this.current)?.onExit?.();
    this.current = name;
    this.states.get(this.current)?.onEnter?.();
  }
  update(dt) { this.states.get(this.current)?.onUpdate?.(dt); }
}
```
**Complexity:** O(1) transitions and updates (Map lookup).

## Object Pool — reused for bullets and particles

Creating and discarding thousands of short-lived objects (bullets, particle
puffs) causes garbage-collection pauses that show up as visible stutter.
The fix is to pre-allocate a fixed pool and *reuse* dead objects instead of
letting them be garbage-collected.

```js
class ObjectPool {
  constructor(factory, size) {
    this.factory = factory;
    this.pool = Array.from({ length: size }, factory);
  }
  obtain() {
    return this.pool.find(o => !o.active) ?? null; // returns null if pool exhausted
  }
  releaseAll(predicate) {
    this.pool.forEach(o => { if (predicate(o)) o.active = false; });
  }
}
```
**Complexity:** O(n) to find a free slot in the naive version above (fine for
pools of a few dozen bullets); if you outgrow that, keep a small stack/queue
of "free indices" for O(1) obtain/release.

## Sprite sheet frame data — array of records

```json
{
  "frames": [
    { "x": 0,  "y": 0, "w": 16, "h": 16 },
    { "x": 16, "y": 0, "w": 16, "h": 16 },
    { "x": 32, "y": 0, "w": 16, "h": 16 }
  ],
  "clips": {
    "idle": { "frames": [0], "frameDuration": 1 },
    "run":  { "frames": [1, 2], "frameDuration": 0.12, "loop": true }
  }
}
```
Animation stepping is just an index + accumulated time — see
`06-animation-system.md` for the `Animator` class that walks this array.

## Fixed timestep accumulator (simulation stability)

Rather than stepping physics by a variable `dt` every frame (which makes
physics behavior depend on frame rate), accumulate time and step the
simulation in fixed-size chunks:

```js
const STEP = 1 / 60; // seconds
let accumulator = 0;

function update(dt) {
  accumulator += dt;
  while (accumulator >= STEP) {
    fixedUpdate(STEP); // physics, collision — always the same size step
    accumulator -= STEP;
  }
  // (optional) interpolate rendering between the last two fixed states
}
```
This guarantees a player's jump arc is identical on a 60Hz and a 144Hz
monitor. See `05-game-loop-and-physics.md` for full integration.

## Flood fill — for the sprite editor's paint-bucket tool

A classic BFS/DFS on a 2D grid: fill every orthogonally-connected pixel that
matches the clicked pixel's original color.

```js
function floodFill(grid, startX, startY, newColor) {
  const target = grid.get(startX, startY);
  if (target === newColor) return;
  const stack = [[startX, startY]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (!grid.inBounds(x, y)) continue;
    if (grid.get(x, y) !== target) continue;
    grid.set(x, y, newColor);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}
```
**Complexity:** O(w × h) worst case (every pixel visited once) — trivial for
a 16×16 or 32×32 sprite canvas.

## Memento pattern — undo/redo in the sprite editor

Each edit pushes a snapshot of the grid onto a history stack; undo pops it
and restores the previous one (redo does the same in reverse onto a second
stack).

```js
class HistoryStack {
  constructor() { this.past = []; this.future = []; }
  push(snapshot) { this.past.push(snapshot); this.future = []; }
  undo(current) {
    if (!this.past.length) return current;
    this.future.push(current);
    return this.past.pop();
  }
  redo(current) {
    if (!this.future.length) return current;
    this.past.push(current);
    return this.future.pop();
  }
}
```
**Complexity:** O(1) push/undo/redo (the snapshot copy itself is O(w × h),
fine at sprite-editor resolutions).

## (Optional, advanced) A* pathfinding

Only relevant if you want smarter enemies than "walk until you hit a wall or
ledge, then turn around." A* uses a **priority queue** (min-heap) keyed by
estimated total cost to find a shortest path across the tilemap. This is
genuinely optional for a first Mario-style game — simple patrol/chase logic
(covered in `07-shooting-and-combat.md` and `12-extending-the-game.md`)
covers the genre's classic enemy behaviors.

## Complexity cheat-sheet

| Operation | Structure | Complexity |
|---|---|---|
| Tile lookup by world position | Flat array grid | O(1) |
| AABB intersection test | — | O(1) |
| All-pairs collision (naive) | — | O(n²) |
| All-pairs collision (spatial grid) | Hash map of cells | ~O(n) |
| FSM transition | Map | O(1) |
| Bullet pool obtain (naive) | Array scan | O(n) |
| Flood fill | BFS/DFS on grid | O(w × h) |
| Undo/redo | Stack of snapshots | O(1) amortized |

Next: `05-game-loop-and-physics.md`.
