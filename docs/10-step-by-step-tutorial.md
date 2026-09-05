# 10 — Step-by-Step Build Order

Work through these milestones in order. Each one names the concept, links
back to the doc that explains it in depth, gives a small real snippet to
show the pattern, and ends with **"My task"** — what I write myself.
Don't skip ahead; each milestone assumes the previous one runs.

---

## Milestone 0 — Project setup

```bash
npm create vite@latest mario-style-game -- --template vanilla
cd mario-style-game
npm install
npm run dev
```

Replace the generated `index.html`/`main.js` with the versions in
`03-file-structure.md`. Create the folder skeleton from that doc now (empty
files are fine — I'll fill them in as I go).

**My task:** get `npm run dev` showing a blank page with a visible canvas
element (give it a background color temporarily to confirm it's there).

---

## Milestone 1 — The game loop

Concept: `05-game-loop-and-physics.md`. Implement `Loop.js` as shown there,
and call it from `main.js`:

```js
// src/main.js
import { Loop } from './engine/core/Loop.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function update(dt) { /* nothing yet */ }
function render() {
  ctx.fillStyle = '#5c94fc'; // sky blue
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

new Loop(update, render).start();
```

**My task:** confirm the canvas clears to sky-blue every frame (open dev
tools → Performance tab, confirm it's steady near 60fps).

---

## Milestone 2 — A static player rectangle

Draw a placeholder box at a fixed position — a stand-in until real art exists.

**My task:** create `Entity.js` and `Player.js` per `03-file-structure.md`.
Give the player a `position` and `size`, and draw a filled rectangle at
`player.position` each frame.

---

## Milestone 3 — Input Manager

Concept: `02-architecture.md` (systems). Build `InputManager.js`:

```js
class InputManager {
  constructor() {
    this.keys = new Set();
    window.addEventListener('keydown', e => this.keys.add(e.code));
    window.addEventListener('keyup', e => this.keys.delete(e.code));
  }
  isDown(action) {
    const map = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space', shoot: 'KeyX' };
    return this.keys.has(map[action]);
  }
}
```

**My task:** move the placeholder rectangle left/right with the arrow keys
(no physics yet — just `position.x += speed * dt`).

---

## Milestone 4 — Camera

Concept: `08-tilemaps-and-levels.md`. Build `Camera.js`, subtract
`camera.x/y` when drawing the player.

**My task:** make the "world" wider than the canvas (e.g. draw a few
vertical reference lines every 100px across a 2000px-wide world) and confirm
the camera follows the player and stops at the world edges.

---

## Milestone 5 — Gravity & jumping

Concept: `05-game-loop-and-physics.md`, full physics section.

**My task:** implement `PHYSICS` constants, apply gravity every frame, and
get jumping working — including variable jump height and coyote time. There's
no ground yet, so temporarily treat `y = 300` as the floor to test against.

---

## Milestone 6 — Real tilemap + tile collision

Concept: `04-data-structures-and-algorithms.md` (Tilemap) +
`05-game-loop-and-physics.md` (collision resolution) + `08-tilemaps-and-levels.md`
(level JSON, culled rendering).

**My task:**
1. Hand-write one small `level-1.json` (a flat strip of ground with a gap or
   two, per the schema in `08-tilemaps-and-levels.md`).
2. Build `Tilemap.js` and `LevelLoader.js`.
3. Replace the temporary `y = 300` floor with real tile collision using the
   separate-axis algorithm.
4. Render the tilemap (culled to the camera viewport).

This is the biggest milestone — take my time here. Once it works, the game
finally "feels like a platformer."

---

## Milestone 7 — Build the sprite editor & draw my character

Concept: the entirety of `09-sprite-editor-tool.md`.

**My task:** build the editor as its own mini-app (it doesn't depend on
anything from the game). Draw:
- An idle frame and 2 run frames for my player character.
- Export as `hopper.png` + `hopper.json` into `assets/sprites/`.

I don't need every tool (bucket fill, onion skinning) working to move on —
pencil + eraser + export is enough to unblock Milestone 8. Come back and
finish the editor's polish whenever I like.

---

## Milestone 8 — Real animation

Concept: `06-animation-system.md`.

**My task:**
1. Build `AssetLoader.js` to fetch the PNG + JSON.
2. Build `SpriteSheet.js` and `Animator.js`.
3. Replace the placeholder rectangle with `animator.draw(...)`.
4. Wire a basic player state machine (idle/running/jumping) so the correct
   clip plays based on velocity, per `02-architecture.md`'s FSM diagram.

---

## Milestone 9 — Enemies with simple AI

Concept: `02-architecture.md` (entities/state) + `07-shooting-and-combat.md`
(stomp collision).

**My task:**
1. Build `Enemy.js` with a trivial patrol behavior: walk one direction,
   reverse on hitting a wall or reaching a ledge (check the tile ahead-and-below
   with `tilemap.tileAt`).
2. Add stomp-vs-hurt collision resolution between player and enemy.
3. Draw my enemy in the sprite editor and wire its animation the same way
   as the player.

---

## Milestone 10 — Shooting

Concept: `07-shooting-and-combat.md`, full section.

**My task:** implement `Projectile.js`, the object pool, fire-rate limiting,
and projectile-vs-enemy collision. Add a "shoot" animation clip and time the
spawn to a specific frame, per `06-animation-system.md`'s muzzle-frame example.

---

## Milestone 11 — HUD & game states

Concept: `02-architecture.md`'s game-level FSM diagram.

**My task:**
1. Build `Scene.js` and at least `MenuScene`, `PlayScene`, `GameOverScene`.
2. Build `HUD.js`: score, lives/health, drawn last, in screen space.
3. Wire win condition (reach a flag/end-of-level trigger) and lose condition
   (health reaches 0 or falling off the bottom of the level).

---

## Milestone 12 — Audio

Concept: `01-tech-stack.md` (Web Audio API).

**My task:** build `AudioManager.js` with `play(name)` for one-shot SFX
(jump, shoot, stomp, hurt) and `playMusic(name)` for a looping track, plus a
mute toggle. Subscribe SFX playback to the event bus (`enemyDefeated` →
stomp sound, etc.) rather than calling audio code inline everywhere.

---

## Milestone 13 — Polish & deploy

Concept: `11-testing-performance-deployment.md`.

**My task:** run a performance pass (object pooling in place? offscreen
tiles culled?), write a couple of Vitest unit tests for my collision math,
then `npm run build` and deploy the `dist/` folder to GitHub Pages, Netlify,
or Vercel.

---

## I'm done when...

- [ ] I can run, jump, and land on tile-based ground.
- [ ] My player animates (idle/run/jump) using art I drew myself.
- [ ] At least one enemy patrols and can be defeated by stomping or shooting.
- [ ] Health/lives and a score are tracked and shown in a HUD.
- [ ] There's a menu, a playable level, and a game-over/win screen.
- [ ] Sound plays for at least jump/shoot/stomp.
- [ ] The game is deployed and playable at a public URL.

From here, `12-extending-the-game.md` has a long list of what to build next.

Next: `11-testing-performance-deployment.md`.
