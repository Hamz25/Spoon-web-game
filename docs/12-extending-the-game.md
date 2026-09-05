# 12 — Extending the Game

Once the core loop from `10-step-by-step-tutorial.md` works end to end,
here's where to go next, roughly ordered by effort.

## Small additions (an afternoon each)

- **Power-ups** — a `Pickup` entity that, on collision, applies a timed
  buff to the player (e.g. faster fire rate, temporary invulnerability, a
  size change). Model it as: `{ apply(player), duration, onExpire(player) }`,
  tracked with a simple countdown timer, similar to `invulnerableTimer`.
- **Coins/score pickups** — trivial `Pickup` variant; on collision, emit a
  `coinCollected` event, increment score, play a sound, remove the pickup.
- **Checkpoints** — store a "last checkpoint" position; on death, respawn
  there instead of at the level start.
- **Screen transitions** — a simple fade-to-black/fade-in between scenes
  using a full-screen semi-transparent rectangle whose alpha ramps over a
  fraction of a second.

## Medium additions (a few days each)

- **Multiple levels + level select** — extend `LevelLoader` to accept a
  level index/path list; add a simple `LevelSelectScene`.
- **Boss enemies** — a state machine with attack "phases" instead of simple
  patrol behavior (e.g. `phase1` → `phase2` at 50% health), each phase
  driving different movement/attack patterns. Reuses the exact
  `FiniteStateMachine` from `04-data-structures-and-algorithms.md`.
- **Save/load progress** — serialize a small state object (level reached,
  score, unlocked items) to `localStorage` as JSON; restore it on boot.
  For anything larger (many levels, replay data), `IndexedDB` scales better
  than `localStorage`'s string-only, ~5MB limit.
- **Mobile touch controls** — on-screen buttons feeding the same
  `InputManager` interface (see `11-testing-performance-deployment.md`).
- **A level editor** — genuinely just your sprite editor's grid concept
  applied to tiles instead of pixels: a `Tilemap`-sized grid, a tileset
  palette to pick from, paint with click, export to the same level JSON
  schema from `08-tilemaps-and-levels.md`.

## Larger additions (real projects on their own)

- **Smarter enemy AI** — A* pathfinding (briefly introduced in
  `04-data-structures-and-algorithms.md`) for enemies that navigate around
  obstacles rather than simple patrol/turn-around logic.
- **Particle system** — a pooled collection of tiny short-lived entities
  (position, velocity, fade-out lifespan) for dust, explosions, sparks;
  architecturally identical to the projectile pool in
  `07-shooting-and-combat.md`.
- **Gamepad support** — poll `navigator.getGamepads()` each frame inside
  `InputManager`, map buttons/axes to the same `isDown('left')`-style
  interface the rest of the game already uses.
- **Multiplayer** — genuinely a different project: requires a backend
  (e.g. WebSocket server) to relay state between clients, plus decisions
  about authoritative simulation vs. client prediction. Worth attempting
  only after the single-player game is solid.
- **Accessibility** — remappable controls (store key bindings in
  `InputManager` as data, not hardcoded), a colorblind-friendly palette
  option for your sprite work, adjustable game speed.

## A note on scope

The single biggest risk to finishing a hobby game is scope creep before the
core loop (run/jump/shoot/one enemy/one level) is fun. Get through
`10-step-by-step-tutorial.md` fully — including deploying it — before
picking anything from this file. A small, finished game beats a large,
unfinished one, and everything here is easier to add to something that
already works than to design in from scratch.

Next: `13-glossary-and-resources.md`.
