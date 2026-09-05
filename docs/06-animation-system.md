# 06 — Animation System

## The concept

A **sprite sheet** is one image containing every frame of every animation for
a character, laid out in a grid or list. Animation is just: pick a clip
(e.g. "run"), and cycle through its frame indices on a timer.

```
hopper.png (sprite sheet)
┌────┬────┬────┬────┬────┬────┐
│ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │   frame 0    = idle
│idle│run1│run2│jump│shot│hurt│   frames 1-2 = run cycle
└────┴────┴────┴────┴────┴────┘   frame 3    = jump
                                    frame 4    = shooting
                                    frame 5    = hurt
```

This PNG + a JSON file describing the frame rectangles is exactly what my
sprite editor tool (see `09-sprite-editor-tool.md`) will export, and exactly
what the game loads.

## SpriteSheet class

```js
// engine/animation/SpriteSheet.js
class SpriteSheet {
  constructor(image, frameData) {
    this.image = image;         // an HTMLImageElement, already loaded
    this.frames = frameData.frames; // [{x,y,w,h}, ...]
    this.clips = frameData.clips;   // { idle: {frames:[0], frameDuration:1}, ... }
  }
  drawFrame(ctx, frameIndex, x, y, flipX = false) {
    const f = this.frames[frameIndex];
    ctx.save();
    if (flipX) {
      ctx.translate(x + f.w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    } else {
      ctx.drawImage(this.image, f.x, f.y, f.w, f.h, x, y, f.w, f.h);
    }
    ctx.restore();
  }
}
```

Flipping the sprite for left-facing movement is done with a canvas transform
(`scale(-1, 1)`) rather than drawing a second mirrored image — one sprite
sheet covers both directions.

## Animator class — steps through a clip over time

```js
// engine/animation/Animator.js
class Animator {
  constructor(spriteSheet) {
    this.sheet = spriteSheet;
    this.currentClip = null;
    this.frameIndex = 0;
    this.elapsed = 0;
  }
  play(clipName) {
    if (this.currentClip === clipName) return; // don't restart an already-playing clip
    this.currentClip = clipName;
    this.frameIndex = 0;
    this.elapsed = 0;
  }
  update(dt) {
    const clip = this.sheet.clips[this.currentClip];
    this.elapsed += dt;
    if (this.elapsed >= clip.frameDuration) {
      this.elapsed = 0;
      this.frameIndex++;
      if (this.frameIndex >= clip.frames.length) {
        this.frameIndex = clip.loop ? 0 : clip.frames.length - 1;
      }
    }
  }
  draw(ctx, x, y, flipX) {
    const clip = this.sheet.clips[this.currentClip];
    const frame = clip.frames[this.frameIndex];
    this.sheet.drawFrame(ctx, frame, x, y, flipX);
  }
}
```

## Wiring animation to the character state machine

This is the payoff of the FSM from `02-architecture.md`: the *state* decides
the animation, so I never manually decide "which sprite to draw" in
scattered places.

```js
function syncAnimationToState(player) {
  const clipForState = {
    idle: 'idle', running: 'run', jumping: 'jump',
    falling: 'jump', shooting: 'shoot', hurt: 'hurt', dead: 'hurt',
  };
  player.animator.play(clipForState[player.stateMachine.current]);
  player.animator.update(dt);
}

function render(player, ctx, camera) {
  const screenX = player.position.x - camera.x;
  const screenY = player.position.y - camera.y;
  player.animator.draw(ctx, screenX, screenY, player.facing === 'left');
}
```

## Example exported metadata format

This is the JSON my sprite editor should produce next to each PNG — see
`09-sprite-editor-tool.md`'s `Exporter.js`:

```json
{
  "imageWidth": 96,
  "imageHeight": 16,
  "frameSize": { "w": 16, "h": 16 },
  "frames": [
    { "x": 0,  "y": 0, "w": 16, "h": 16 },
    { "x": 16, "y": 0, "w": 16, "h": 16 },
    { "x": 32, "y": 0, "w": 16, "h": 16 },
    { "x": 48, "y": 0, "w": 16, "h": 16 },
    { "x": 64, "y": 0, "w": 16, "h": 16 },
    { "x": 80, "y": 0, "w": 16, "h": 16 }
  ],
  "clips": {
    "idle":  { "frames": [0], "frameDuration": 1, "loop": true },
    "run":   { "frames": [1, 2], "frameDuration": 0.12, "loop": true },
    "jump":  { "frames": [3], "frameDuration": 1, "loop": false },
    "shoot": { "frames": [4], "frameDuration": 0.15, "loop": false },
    "hurt":  { "frames": [5], "frameDuration": 0.3, "loop": false }
  }
}
```

## Timing shooting to a specific animation frame

A common polish detail: spawn the actual projectile on the *specific frame*
of the shoot animation where the arm/weapon reaches full extension, not the
instant the button is pressed.

```js
function updateShootingAnimation(player, dt) {
  player.animator.update(dt);
  const isMuzzleFrame = player.animator.frameIndex === 0 &&
                         player.animator.currentClip === 'shoot' &&
                         !player.hasFiredThisAnimation;
  if (isMuzzleFrame) {
    spawnProjectile(player);
    player.hasFiredThisAnimation = true;
  }
}
```

See `07-shooting-and-combat.md` for `spawnProjectile`.

## Checklist

- [ ] One sprite sheet image per character, sliced into equally-sized frames.
- [ ] A JSON file next to it describing frame rects and named clips.
- [ ] `Animator.play(clipName)` is idempotent (doesn't restart an already-playing clip — avoids stutter every frame).
- [ ] Facing direction is a `scale(-1,1)` transform, not a duplicate mirrored sheet.
- [ ] The character's state machine — not ad-hoc `if` statements — decides which clip plays.

Next: `07-shooting-and-combat.md`.
