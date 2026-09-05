# 11 — Testing, Performance & Deployment

## Testing

Most of a game is inherently visual/interactive and best checked by playing
it — but the **pure logic** (no canvas, no DOM) is genuinely unit-testable
and worth covering, since bugs there are often subtle (off-by-one collision
errors, wrong state transitions).

```js
// test/aabb.test.js
import { describe, it, expect } from 'vitest';
import { intersects } from '../src/utils/math.js';

describe('AABB intersects', () => {
  it('detects overlap', () => {
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
  });
  it('detects no overlap', () => {
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 10, height: 10 })).toBe(false);
  });
});
```

```js
// test/stateMachine.test.js
import { describe, it, expect } from 'vitest';
import { FiniteStateMachine } from '../src/game/states/FiniteStateMachine.js';

describe('FiniteStateMachine', () => {
  it('transitions and calls lifecycle hooks', () => {
    let entered = false;
    const fsm = new FiniteStateMachine('idle');
    fsm.add('idle', {});
    fsm.add('running', { onEnter: () => { entered = true; } });
    fsm.transition('running');
    expect(fsm.current).toBe('running');
    expect(entered).toBe(true);
  });
});
```

Run with:
```bash
npm install -D vitest
npx vitest
```

**What to test:** AABB math, tile collision resolution, state machine
transitions, object pool obtain/release, flood fill correctness.
**What not to bother unit-testing:** rendering code, animation timing "feel,"
anything requiring a real canvas — playtest those by hand instead.

## Manual playtesting checklist

- Does jumping feel responsive, or floaty/sluggish? (tune `PHYSICS` constants)
- Can I get stuck in geometry (corners, one-way platforms)?
- Does the camera ever show outside the level bounds?
- Is there ever a frame where an enemy or bullet visibly "teleports" through
  a wall (a sign `dt` isn't clamped, or collision isn't checked every fixed step)?
- Use the browser's dev tools **Performance** tab to record a play session
  and check the frame time graph stays under ~16.6ms (60fps).

## Performance

For a game this size, performance problems almost always come from one of:

1. **Allocating objects every frame** (bullets, particles) → use the
   `ObjectPool` pattern from `04-data-structures-and-algorithms.md`.
2. **Rendering off-screen content** → cull tiles/entities outside the camera
   viewport (`08-tilemaps-and-levels.md`).
3. **Excessive `ctx.save()`/`ctx.restore()`** calls or redundant `fillStyle`
   changes — batch draws with the same style together where practical.
4. **Re-decoding images every frame** — load images once via `AssetLoader`
   at startup, never inside the render loop.
5. **Uncapped `dt` after a dropped frame** — clamp it (see `05-game-loop-and-physics.md`)
   so a stutter doesn't cascade into tunneling or a "spiral of death."

For a genuinely large number of entities (hundreds+), consider:
- A spatial grid for broad-phase collision (`04-data-structures-and-algorithms.md`).
- Pre-rendering static layers (e.g. background) to an offscreen canvas once,
  then blitting that single image each frame instead of redrawing shapes.

## Crisp pixel art & responsive scaling

```css
canvas { image-rendering: pixelated; }
```
For a canvas that scales with the window while staying crisp, prefer
**integer scaling** (2x, 3x, 4x) over arbitrary CSS sizes — non-integer
scaling blurs or introduces uneven pixel sizes even with `pixelated` set.

```js
function fitCanvasIntegerScale(canvas, baseWidth, baseHeight) {
  const scale = Math.max(1, Math.floor(Math.min(
    window.innerWidth / baseWidth,
    window.innerHeight / baseHeight
  )));
  canvas.style.width = `${baseWidth * scale}px`;
  canvas.style.height = `${baseHeight * scale}px`;
}
```

## Mobile & alternate input (optional, see also `12-extending-the-game.md`)

- Touch: render on-screen d-pad + jump/shoot buttons as absolutely-positioned
  HTML elements over the canvas, wired to the same `InputManager.isDown()`
  interface so game code doesn't know the difference between keyboard and touch.
- Gamepad: `navigator.getGamepads()`, polled once per frame inside `InputManager`.

## Deployment

The production build is fully static — any static host works.

```bash
npm run build      # outputs to dist/
```

**GitHub Pages:**
1. Push `dist/` to a `gh-pages` branch (or use the `gh-pages` npm package,
   or a GitHub Actions workflow that runs `npm run build` and publishes `dist/`).
2. Enable Pages in the repo settings, pointing at that branch.

**Netlify / Vercel:**
1. Connect the repo.
2. Build command: `npm run build`. Publish directory: `dist`.
3. Deploys automatically on every push.

No environment variables, database, or backend config needed for the base
game — only relevant if I add the multiplayer/cloud-save features from
`12-extending-the-game.md`.

Next: `12-extending-the-game.md`.
