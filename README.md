# Building a Super-Mario-Bros-Style Platformer (In the Browser)

This is a complete documentation package for building **your own** side-scrolling
platformer — the kind of game *Super Mario Bros.* made famous — that runs
entirely in a web browser, plus a **companion pixel-art sprite editor** you build
yourself to create the character, enemy, and tile art.

> **A note on originality:** Mario, Goombas, Koopas, etc. are Nintendo's
> trademarked/copyrighted characters. This guide teaches you the *genre's
> mechanics* (run, jump, stomp, shoot, collect) so you can build an original
> game in that style with your own art and your own character names. Every
> example in this package uses invented names (e.g. "Hopper", "the Grump",
> "Shellback") specifically so the end result is yours.

This is **documentation, not a finished game** — it's structured so you learn
the concepts and write the code yourself, with enough real code samples,
diagrams, and pseudocode that you're never staring at a blank page.

---

## What's in this package

```
mario-style-game-docs/
├── README.md                              ← you are here
└── docs/
    ├── 01-tech-stack.md                   Languages, APIs, tools, and why
    ├── 02-architecture.md                 Engine layers, patterns, diagrams
    ├── 03-file-structure.md               Full project folder layout
    ├── 04-data-structures-and-algorithms.md
    ├── 05-game-loop-and-physics.md        Loop, gravity, jumping, collision
    ├── 06-animation-system.md             Sprite sheets, state-driven anim
    ├── 07-shooting-and-combat.md          Projectiles, damage, pooling
    ├── 08-tilemaps-and-levels.md          Levels, camera, parallax
    ├── 09-sprite-editor-tool.md           Build your own pixel-art editor
    ├── 10-step-by-step-tutorial.md        Milestone-by-milestone build order
    ├── 11-testing-performance-deployment.md
    ├── 12-extending-the-game.md           Power-ups, bosses, saves, mobile
    └── 13-glossary-and-resources.md
```

Read them roughly in order the first time through. After that, treat them as
reference material — jump to whichever doc matches what you're building that day.

---

## Prerequisites

- Comfortable with JavaScript basics (functions, classes, arrays, objects).
- Node.js installed (for a dev server/bundler) — any recent LTS version.
- A code editor (VS Code is a common choice) and a modern browser with dev tools.
- No prior game-dev experience required. No paid tools required.

---

## The 60-second overview

| Question | Short answer |
|---|---|
| **Can this be done in a browser?** | Yes — the HTML5 `<canvas>` element plus plain JavaScript is enough to build a full platformer. No plugins needed. |
| **What stack?** | Vanilla JavaScript + Canvas 2D API for the engine/game (recommended for learning), bundled with Vite. See `01-tech-stack.md`. |
| **What's the architecture?** | A real-time game loop driving small, focused systems (input, physics, collision, animation, render) that act on plain-object "entities." See `02-architecture.md`. |
| **How does animation work?** | Sprite sheets (one image, many frames) stepped through on a timer, selected by the character's current state (idle/run/jump/shoot). See `06-animation-system.md`. |
| **How does shooting work?** | Spawn a lightweight "projectile" entity from a pool, move it every frame, test it against enemies with box collision. See `07-shooting-and-combat.md`. |
| **How do I make the character art?** | Build a small pixel-art editor web app (its own mini-project, fully documented in `09-sprite-editor-tool.md`) that exports PNG + JSON your game can load directly. |

---

## Suggested learning path / milestones

- [ ] **Week 1** — Read `01`–`04`. Set up the project. Get a colored square moving with the keyboard.
- [ ] **Week 2** — Gravity, jumping, and a tile-based level you can walk on (`05`, `08`).
- [ ] **Week 3** — Build the pixel-art editor (`09`) and draw your character + one enemy.
- [ ] **Week 4** — Swap the square for real sprite animation (`06`); add an enemy with simple patrol AI.
- [ ] **Week 5** — Add shooting (`07`), a HUD, win/lose states, sound.
- [ ] **Week 6** — Polish, test, deploy (`11`), then chase extension ideas (`12`).

Each doc's tutorial steps are self-contained enough that you can stretch or
compress this timeline freely.

---

## How to use the code samples

Every snippet in this package is real, runnable JavaScript demonstrating one
concept at a time — not a copy-paste-the-whole-game dump. The
`10-step-by-step-tutorial.md` file explicitly separates **"here's the pattern"**
code from a **"your task"** checklist, because the fastest way to actually
learn this is to write the wiring yourself once you've seen the pattern.

Start with `docs/01-tech-stack.md`.
