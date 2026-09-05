# 07 — Shooting & Combat System

## Projectile entity

A projectile is a minimal entity: position, velocity, who fired it, how much
damage it does, and a lifespan so stray shots don't live forever.

```js
// game/entities/Projectile.js
class Projectile {
  constructor() {
    this.position = new Vector2();
    this.velocity = new Vector2();
    this.damage = 1;
    this.owner = null;      // 'player' | 'enemy' — so bullets don't hit their own team
    this.lifespan = 1.5;    // seconds before auto-despawn
    this.age = 0;
    this.active = false;    // pooled — see below
  }
  update(dt) {
    if (!this.active) return;
    this.position = this.position.add(this.velocity.scale(dt));
    this.age += dt;
    if (this.age >= this.lifespan) this.active = false;
  }
}
```

## Pooling projectiles

Bullets are created and destroyed constantly — a textbook case for the
`ObjectPool` pattern from `04-data-structures-and-algorithms.md`, so you're
not triggering garbage collection every time the player fires.

```js
const projectilePool = new ObjectPool(() => new Projectile(), 30);

function spawnProjectile(player) {
  const p = projectilePool.obtain();
  if (!p) return; // pool exhausted — simply skip this shot
  p.active = true;
  p.age = 0;
  p.owner = 'player';
  p.damage = 1;
  const dir = player.facing === 'right' ? 1 : -1;
  p.position = new Vector2(player.position.x + (dir > 0 ? player.size.width : -8), player.position.y + 6);
  p.velocity = new Vector2(dir * 320, 0);
}
```

## Fire-rate limiting

```js
function tryShoot(player, dt) {
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  if (input.isDown('shoot') && player.shootCooldown === 0) {
    player.stateMachine.transition('shooting');
    player.shootCooldown = 0.35; // seconds between shots
  }
}
```

## Collision: projectile vs. enemy

```js
function resolveProjectileHits(projectiles, enemies, events) {
  for (const p of projectiles) {
    if (!p.active) continue;
    for (const enemy of enemies) {
      if (!enemy.alive || p.owner === 'enemy') continue;
      if (intersects(p.getAABB(), enemy.getAABB())) {
        enemy.health.current -= p.damage;
        p.active = false;
        events.emit('enemyHit', { enemy });
        if (enemy.health.current <= 0) {
          enemy.alive = false;
          events.emit('enemyDefeated', { enemy, points: enemy.pointValue });
        }
      }
    }
  }
}
```

## Health & damage on the player side

```js
function damagePlayer(player, amount, events) {
  if (player.invulnerableTimer > 0) return; // i-frames active, ignore hit
  player.health.current -= amount;
  player.invulnerableTimer = 1.0; // 1 second of invulnerability after a hit
  player.stateMachine.transition(player.health.current <= 0 ? 'dead' : 'hurt');
  events.emit('playerHit', { remaining: player.health.current });
}

function updateInvulnerability(player, dt) {
  player.invulnerableTimer = Math.max(0, player.invulnerableTimer - dt);
}
```

**i-frames (invulnerability frames)** are essential — without them, standing
in a hazard can drain all your health in a single frame.

## Two classic Mario-style hit interactions

1. **Stomp** — landing on top of an enemy defeats it; touching it from the
   side hurts the player. Distinguish by comparing velocity and relative
   position at the moment of collision:

```js
function resolvePlayerEnemyCollision(player, enemy, events) {
  if (!intersects(player.getAABB(), enemy.getAABB())) return;
  const stomping = player.velocity.y > 0 &&
                    (player.position.y + player.size.height) < (enemy.position.y + enemy.size.height * 0.5);
  if (stomping) {
    enemy.alive = false;
    player.velocity.y = PHYSICS.JUMP_VELOCITY * 0.5; // small bounce
    events.emit('enemyDefeated', { enemy, points: enemy.pointValue });
  } else {
    damagePlayer(player, 1, events);
  }
}
```

2. **Shooting** — as above, ranged combat via `Projectile`.

You can mix both: some enemies are only vulnerable to shots (e.g. flying
enemies you can't stomp), which is a good use of the `tags` set on `Entity`.

## Game feel extras (small effort, big payoff)

- **Hit-stop**: freeze the game for ~50ms on a solid hit (skip a couple of
  update ticks) — makes hits feel weighty.
- **Screen shake**: briefly offset the camera by a small random amount,
  decaying over a few frames.
- **Muzzle flash / hit particles**: a tiny particle burst on `enemyHit` /
  `enemyDefeated` events (subscribe via the event bus from
  `02-architecture.md`).

None of these are required for a functioning game — treat them as
`12-extending-the-game.md`-style polish once the core loop works.

## Checklist

- [ ] Projectiles come from a pool, not `new Projectile()` on every shot.
- [ ] Fire rate is limited by a cooldown timer.
- [ ] Projectiles carry an `owner` so friendly fire doesn't happen by accident.
- [ ] The player has invulnerability frames after taking damage.
- [ ] Stomping and shooting are distinguished by collision geometry/velocity, not a special-cased flag.

Next: `08-tilemaps-and-levels.md`.
