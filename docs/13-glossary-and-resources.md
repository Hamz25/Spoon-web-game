# 13 — Glossary & Resources

## Glossary

| Term | Meaning |
|---|---|
| **AABB** | Axis-Aligned Bounding Box — a non-rotated rectangle used to approximate an object's shape for collision detection. |
| **Broad-phase / narrow-phase** | Two-step collision detection: broad-phase cheaply narrows down *candidate* pairs of objects; narrow-phase does the exact, more expensive test on just those pairs. |
| **Coyote time** | A short grace period after walking off a ledge during which the player can still jump, compensating for imperfect human timing. |
| **Delta time (dt)** | The time elapsed since the last frame, used to make movement/physics frame-rate independent. |
| **ECS (Entity-Component-System)** | An architecture where game objects are IDs with attached data "components," processed by independent "systems" — a fuller version of the composition pattern used in this package. |
| **Finite State Machine (FSM)** | A model with a fixed set of named states and rules for transitioning between them; used here for both game screens and character behavior/animation. |
| **Flood fill** | An algorithm (BFS/DFS on a grid) that fills all connected matching cells starting from a point — the mechanism behind a paint-bucket tool. |
| **Game loop** | The core `update → render` cycle that runs continuously, typically ~60 times per second via `requestAnimationFrame`. |
| **Hit-stop** | Briefly freezing gameplay for a few milliseconds on a solid hit, to make combat feel more impactful. |
| **i-frames (invulnerability frames)** | A short window after taking damage during which further hits are ignored. |
| **Object pool** | A fixed set of pre-allocated, reusable objects (e.g. bullets) that are recycled instead of constantly created/destroyed, avoiding garbage-collection stutter. |
| **One-way platform** | A platform I can jump up through from below but land on top of, implemented by only resolving downward collisions. |
| **Painter's algorithm** | Rendering back-to-front so nearer objects naturally overlap farther ones, without a full depth-buffer system. |
| **Parallax scrolling** | Multiple background layers moving at different speeds relative to the camera, creating an illusion of depth. |
| **Sprite sheet** | A single image containing every animation frame for a character or object, referenced by frame rectangles. |
| **Tilemap** | A level represented as a grid of tile IDs, each ID mapped to an image and a behavior (solid, hazard, etc.). |

## Further resources

- **MDN — Canvas API**: the definitive reference for `CanvasRenderingContext2D`.
- **MDN — Game development section**: browser-specific guidance on loops, input, and audio for games.
- **MDN — `requestAnimationFrame`**: how the browser schedules frame callbacks.
- **MDN — Web Audio API**: for anything beyond a plain `<audio>` tag (mixing, effects).
- **Vite documentation** (vitejs.dev): dev server and build tooling used throughout this package.
- **Vitest documentation** (vitest.dev): the test runner referenced in `11-testing-performance-deployment.md`.
- **Phaser documentation** (phaser.io): a full-featured alternative once I understand the concepts here.
- **Tiled Map Editor** (mapeditor.org): a free visual tool for building tilemap levels, mentioned in `08-tilemaps-and-levels.md`.
- **"Game Programming Patterns" by Robert Nystrom** (freely readable online): excellent deeper coverage of the Game Loop, Object Pool, State, and Observer patterns used throughout this package.
- **freesound.org**: a good source of Creative-Commons-licensed sound effects if I don't want to record my own.

## Where each concept lives (quick index)

| Concept | Doc |
|---|---|
| Stack choice & rationale | `01-tech-stack.md` |
| Engine/game split, patterns, event bus | `02-architecture.md` |
| Folder layout | `03-file-structure.md` |
| Vectors, AABB, grids, pooling, FSM, flood fill, Big-O | `04-data-structures-and-algorithms.md` |
| Game loop, gravity, jumping, tile collision | `05-game-loop-and-physics.md` |
| Sprite sheets, Animator, state-driven animation | `06-animation-system.md` |
| Projectiles, pooling, damage, stomping | `07-shooting-and-combat.md` |
| Level JSON, camera, parallax, one-way platforms | `08-tilemaps-and-levels.md` |
| Building the pixel-art editor | `09-sprite-editor-tool.md` |
| Milestone-by-milestone build order | `10-step-by-step-tutorial.md` |
| Testing, performance, deployment | `11-testing-performance-deployment.md` |
| Power-ups, bosses, saves, mobile, multiplayer | `12-extending-the-game.md` |

I've reached the end of the package — back to `README.md` for the overview,
or `10-step-by-step-tutorial.md` to start building.
