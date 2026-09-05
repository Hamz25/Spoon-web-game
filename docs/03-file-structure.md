# 03 — File Structure

## Full project layout

A single repo containing both the game and the sprite-editor tool as sibling
projects works well — they share concepts and I'll bounce between them.

```
mario-style-game/
├── index.html                     Entry HTML for the game
├── package.json
├── vite.config.js
├── .gitignore
│
├── public/                        Static files copied as-is
│   └── favicon.ico
│
├── src/
│   ├── main.js                    Boots the game: creates canvas, starts Loop
│   │
│   ├── engine/                    ── GENERIC, reusable across any game ──
│   │   ├── core/
│   │   │   ├── Game.js            Top-level orchestrator (holds current Scene)
│   │   │   ├── Loop.js            requestAnimationFrame loop, fixed timestep
│   │   │   ├── Vector2.js         2D vector math
│   │   │   └── EventBus.js        Publish/subscribe event system
│   │   ├── input/
│   │   │   └── InputManager.js    Keyboard (and optionally gamepad) state
│   │   ├── render/
│   │   │   ├── Renderer.js        Canvas 2D drawing helpers
│   │   │   └── Camera.js          Viewport position, follow + clamp logic
│   │   ├── assets/
│   │   │   └── AssetLoader.js     Preloads images/audio, returns promises
│   │   ├── audio/
│   │   │   └── AudioManager.js    Play SFX/music, volume, mute
│   │   ├── physics/
│   │   │   ├── AABB.js            Box intersection tests
│   │   │   └── CollisionSystem.js Tile & entity collision resolution
│   │   └── animation/
│   │       ├── SpriteSheet.js     Loads an image + frame metadata
│   │       └── Animator.js        Steps through frames of a clip over time
│   │
│   ├── game/                      ── SPECIFIC to this game ──
│   │   ├── entities/
│   │   │   ├── Entity.js          Base entity (position, velocity, collider…)
│   │   │   ├── Player.js
│   │   │   ├── Enemy.js
│   │   │   ├── Projectile.js
│   │   │   └── Pickup.js          Coins/power-ups
│   │   ├── states/
│   │   │   ├── FiniteStateMachine.js
│   │   │   └── playerStates.js    idle/run/jump/fall/shoot/hurt/dead
│   │   ├── levels/
│   │   │   ├── Tilemap.js         Grid data + tile lookup helpers
│   │   │   ├── LevelLoader.js     Parses level JSON into a Tilemap + entities
│   │   │   └── data/
│   │   │       ├── level-1.json
│   │   │       └── level-2.json
│   │   ├── scenes/
│   │   │   ├── Scene.js           Base scene interface (enter/update/render/exit)
│   │   │   ├── MenuScene.js
│   │   │   ├── PlayScene.js
│   │   │   └── GameOverScene.js
│   │   ├── ui/
│   │   │   └── HUD.js             Score, lives, health bar
│   │   └── config/
│   │       └── constants.js       Gravity, speeds, tile size, etc.
│   │
│   └── utils/
│       ├── ObjectPool.js          Generic reusable-object pool
│       └── math.js                clamp, lerp, AABB helpers, etc.
│
├── assets/
│   ├── sprites/
│   │   ├── hopper.png             Player sprite sheet (exported from my editor)
│   │   ├── hopper.json            Frame metadata for hopper.png
│   │   └── enemies/
│   │       ├── grump.png
│   │       └── grump.json
│   ├── tiles/
│   │   └── tileset.png
│   └── audio/
│       ├── jump.wav
│       ├── shoot.wav
│       ├── stomp.wav
│       └── theme.mp3
│
├── test/                          Vitest unit tests (pure logic only)
│   ├── aabb.test.js
│   └── stateMachine.test.js
│
└── tools/
    └── sprite-editor/             A small, separate web app
        ├── index.html
        ├── package.json           (or share the root one — either works)
        ├── style.css
        └── src/
            ├── main.js
            ├── PixelCanvas.js     Owns the pixel grid + rendering
            ├── Palette.js         Color palette UI + current color state
            ├── tools/
            │   ├── PencilTool.js
            │   ├── EraserTool.js
            │   ├── BucketFillTool.js
            │   └── EyedropperTool.js
            ├── HistoryStack.js    Undo/redo (Memento pattern)
            ├── FrameStrip.js      Multiple frames for animation + onion skin
            └── Exporter.js        PNG + JSON sprite-sheet export
```

## Why this shape?

- **`engine/` vs `game/`** mirrors the architectural split from
  `02-architecture.md`. If I ever start a second game, I copy `engine/`
  wholesale and write a new `game/`.
- **`assets/*.json` next to `*.png`** — every sprite sheet ships with its own
  metadata file describing frame rectangles and animation clips. This is the
  exact format my sprite editor will export (see `09-sprite-editor-tool.md`
  and `06-animation-system.md`).
- **`levels/data/*.json`** — level layouts are data, not code. This means I
  (or eventually a level editor) can add new levels without touching engine
  code.
- **`tools/sprite-editor/`** is intentionally isolated — it doesn't import
  anything from `src/game/`, only shares low-level concepts (canvas, JSON
  export format). I could delete it or move it to its own repo at any point
  without breaking the game.
- **`test/`** holds only pure-logic tests — things with no canvas/DOM
  dependency (AABB math, state machine transitions). See
  `11-testing-performance-deployment.md`.

## Minimal `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Hopper's Adventure</title>
    <style>
      body { margin: 0; background: #1a1a2e; display: grid; place-items: center; height: 100vh; }
      canvas { image-rendering: pixelated; border: 2px solid #333; }
    </style>
  </head>
  <body>
    <canvas id="game" width="640" height="360"></canvas>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`image-rendering: pixelated` is important — without it, the browser smooths
(blurs) my pixel art when it's scaled up.

Next: `04-data-structures-and-algorithms.md`.
