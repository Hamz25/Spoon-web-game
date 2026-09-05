# 01 — Tech Stack

## Core answer

**Vanilla JavaScript (ES2020+) + the HTML5 Canvas 2D API**, bundled and served
by **Vite**. No game framework required — and for *learning* the concepts,
deliberately not using one is the point. A framework like Phaser is mentioned
below as a valid alternative once you understand what it's doing for you.

## Why the browser can do this at all

A browser exposes everything a 2D game engine needs natively:

| Need | Browser API |
|---|---|
| Draw pixels/images every frame | `<canvas>` + `CanvasRenderingContext2D` |
| A smooth, synced game loop | `requestAnimationFrame(callback)` |
| Keyboard / gamepad input | `keydown`/`keyup` events, `navigator.getGamepads()` |
| Sound effects & music | Web Audio API (`AudioContext`) or plain `<audio>` |
| Save progress | `localStorage` / `IndexedDB` |
| Load images fast | `Image` objects / `fetch` + `createImageBitmap` |

Nothing here needs a server beyond serving static files — the entire game
runs client-side.

## The stack, piece by piece

| Layer | Choice | Why |
|---|---|---|
| Language | JavaScript (or TypeScript if you want types) | Runs natively in every browser; TypeScript is a drop-in upgrade later if you want compile-time safety on entity/component shapes. |
| Rendering | Canvas 2D API | Simple, well-documented, plenty fast for a 2D platformer (no need for WebGL/PixiJS unless you have hundreds of moving sprites). |
| Build tool | [Vite](https://vitejs.dev/) | Instant dev server, ES module support, zero-config production bundling (`vite build`). |
| Package manager | npm (ships with Node.js) | Standard, nothing exotic needed. |
| Testing | [Vitest](https://vitest.dev/) | Pairs naturally with Vite; used for pure-logic tests (collision math, state machines) — see `11-testing-performance-deployment.md`. |
| Version control | Git (+ GitHub/GitLab) | Track your progress, and it's how you'll deploy to GitHub Pages later. |
| Deployment | Static host: GitHub Pages, Netlify, or Vercel | The whole build output is static HTML/JS/CSS/images — no backend required. |

## Alternative: using a game framework instead

If your goal is "ship a game" rather than "learn how engines work," these are
legitimate shortcuts. This package still teaches useful things if you go this
route (the *concepts* — state machines, collision, animation — transfer
directly), but the code samples in this package are vanilla-JS.

| Framework | What it gives you | Trade-off |
|---|---|---|
| **Phaser 3** | Full 2D engine: physics (arcade/matter), sprite/animation system, tilemap loader, audio, input — batteries included. | You're learning Phaser's API more than raw game-dev concepts. |
| **Kaboom/Kaplay** | Very beginner-friendly, function-based API, great for jams. | Less standard architecture (harder to generalize what you learn to other tools). |
| **PixiJS** | A rendering engine (WebGL-accelerated), not a full game framework — you still build physics/collision/state yourself. | More raw power/performance, more you build by hand. |

**Recommendation:** build the vanilla version first using this package. If you
later want to build something bigger/faster, you'll understand exactly what
Phaser is doing under the hood, which makes learning it trivial.

## Stack for the pixel-art sprite editor

This is a **separate small web app** (documented fully in
`09-sprite-editor-tool.md`), using the same core technology so you don't have
to learn a second stack:

| Need | Tool |
|---|---|
| Drawing surface | `<canvas>`, pixels rendered as scaled-up filled rectangles or via `ImageData` |
| UI (toolbar, palette, frames) | Plain HTML/CSS, or a few `<div>`s — no framework required at this scale |
| Export | `canvas.toDataURL('image/png')` for images, plain `JSON.stringify` for frame metadata |
| Undo/redo | An in-memory history stack (see `04-data-structures-and-algorithms.md`) |

You can build it as a second folder in the same project (a small
"tools/sprite-editor" app) or as a fully separate repo — both are covered in
`03-file-structure.md`.

## What you do *not* need

- A backend server (unless you add multiplayer or cloud saves later — see `12-extending-the-game.md`).
- A database.
- WebGL/Three.js (that's for 3D or very heavy 2D effects).
- A game engine like Unity/Godot — those are great tools, but the ask here is specifically "in the browser, from scratch."

Next: `02-architecture.md`.
