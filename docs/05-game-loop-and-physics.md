# 05 — Game Loop & Physics

## Physics constants

Tune these to get "game feel" right — Mario-style movement is famously
snappy, not realistic. Start here and adjust by feel:

```js
// game/config/constants.js
export const PHYSICS = {
  GRAVITY: 1400,          // px/s^2
  MAX_FALL_SPEED: 700,    // px/s (terminal velocity)
  MOVE_SPEED: 180,        // px/s, horizontal run speed
  ACCELERATION: 1200,     // px/s^2, ramp-up to MOVE_SPEED
  FRICTION: 1400,         // px/s^2, ramp-down when no input
  JUMP_VELOCITY: -480,    // px/s (negative = up, in screen coords)
  JUMP_CUT_MULTIPLIER: 0.4, // shrink upward velocity if jump released early
};
```

## Applying gravity and movement each frame

```js
function updatePlayerPhysics(player, input, dt) {
  // Horizontal: accelerate toward input direction, decelerate toward 0
  const dir = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
  if (dir !== 0) {
    player.velocity.x += dir * PHYSICS.ACCELERATION * dt;
    player.velocity.x = clamp(player.velocity.x, -PHYSICS.MOVE_SPEED, PHYSICS.MOVE_SPEED);
    player.facing = dir > 0 ? 'right' : 'left';
  } else {
    const decel = PHYSICS.FRICTION * dt;
    player.velocity.x = Math.abs(player.velocity.x) <= decel ? 0
      : player.velocity.x - Math.sign(player.velocity.x) * decel;
  }

  // Vertical: gravity always applies, clamped to terminal velocity
  player.velocity.y = Math.min(player.velocity.y + PHYSICS.GRAVITY * dt, PHYSICS.MAX_FALL_SPEED);
}
```

## Jumping: the three details that make it feel good

1. **Only jump when grounded** (or during coyote time — see below).
2. **Variable jump height** — cut the jump short if the button is released
   early, instead of a fixed-height hop every time:

```js
function onJumpPressed(player) {
  if (player.grounded || player.coyoteTimer > 0) {
    player.velocity.y = PHYSICS.JUMP_VELOCITY;
    player.grounded = false;
  }
}
function onJumpReleased(player) {
  if (player.velocity.y < 0) {
    player.velocity.y *= PHYSICS.JUMP_CUT_MULTIPLIER;
  }
}
```

3. **Coyote time** — let the player jump for a short grace window (~0.1s)
   after walking off a ledge, since real players' inputs are never
   pixel-perfect:

```js
player.coyoteTimer = player.grounded ? 0.1 : Math.max(0, player.coyoteTimer - dt);
```

4. **Jump buffering** (optional polish) — if the jump key is pressed slightly
   *before* landing, queue it so it still fires the instant the player lands,
   rather than requiring frame-perfect timing.

## Tile collision, end to end

Combine the separate-axis algorithm from `04-data-structures-and-algorithms.md`
with the tilemap:

```js
function resolveTileCollisions(entity, tilemap, dt) {
  // --- X axis ---
  entity.position.x += entity.velocity.x * dt;
  for (const tile of solidTilesOverlapping(entity, tilemap)) {
    if (entity.velocity.x > 0) entity.position.x = tile.x - entity.size.width;
    else if (entity.velocity.x < 0) entity.position.x = tile.x + tilemap.tileSize;
    entity.velocity.x = 0;
  }

  // --- Y axis ---
  entity.position.y += entity.velocity.y * dt;
  entity.grounded = false;
  for (const tile of solidTilesOverlapping(entity, tilemap)) {
    if (entity.velocity.y > 0) {
      entity.position.y = tile.y - entity.size.height;
      entity.grounded = true;
    } else if (entity.velocity.y < 0) {
      entity.position.y = tile.y + tilemap.tileSize;
    }
    entity.velocity.y = 0;
  }
}

function solidTilesOverlapping(entity, tilemap) {
  const box = entity.getAABB();
  const results = [];
  const startCol = Math.floor(box.x / tilemap.tileSize);
  const endCol = Math.floor((box.x + box.width) / tilemap.tileSize);
  const startRow = Math.floor(box.y / tilemap.tileSize);
  const endRow = Math.floor((box.y + box.height) / tilemap.tileSize);
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (tilemap.tileAt(col, row) !== 0 /* 0 = empty */) {
        results.push({ x: col * tilemap.tileSize, y: row * tilemap.tileSize });
      }
    }
  }
  return results;
}
```

Only the handful of tiles the entity's box actually overlaps are checked —
never the whole map — which is why the tilemap's O(1) `tileAt` lookup matters.

## Fixed timestep integration (putting it together)

```js
const STEP = 1 / 60;
let accumulator = 0;

function update(dt) {
  accumulator = Math.min(accumulator + dt, 0.25); // avoid spiral of death
  while (accumulator >= STEP) {
    updatePlayerPhysics(player, input, STEP);
    resolveTileCollisions(player, level.tilemap, STEP);
    updateEnemies(enemies, STEP);
    updateProjectiles(projectiles, STEP);
    accumulator -= STEP;
  }
}
```

## One-way platforms (a common Mario-style feature)

A platform you can jump up through but land on top of: only resolve a
collision on the Y axis when the entity is moving downward *and* was above
the platform's top edge last frame.

```js
function isOneWayCollision(entity, platform) {
  return entity.velocity.y >= 0 &&
         (entity.previousPosition.y + entity.size.height) <= platform.y;
}
```

## Summary checklist for this section

- [ ] Loop calls `update(dt)` then `render()`, every frame, via `requestAnimationFrame`.
- [ ] `dt` is clamped to avoid physics blowing up after a tab is backgrounded.
- [ ] Gravity applies every frame; horizontal movement accelerates/decelerates rather than snapping.
- [ ] Jump height is variable (cut short on early release) and forgiving (coyote time).
- [ ] Collision resolves X and Y **separately**, each frame.
- [ ] Only nearby tiles are tested for collision, never the whole map.

Next: `06-animation-system.md`.
