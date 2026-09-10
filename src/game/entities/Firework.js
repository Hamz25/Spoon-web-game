// src/game/entities/Firework.js
/*
    The payoff for collecting the "firework" item from its chest (see
    Chest.js's new `grantsItem` field and BirthdayScene.js's chest_2
    factory). This entity IS the rocket itself - PlayScene builds a fresh
    one and drops it straight into level.entities every time she presses
    the new 'fireworks' key while she's holding at least one (see
    PlayScene.update()), the same way LevelLoader spawns Chest/Cat/
    MessageZone from the level JSON, just at runtime instead of load time.

    Two phases, tracked with a plain string instead of pulling in
    FiniteStateMachine.js - there's only ever one transition per rocket, so
    a full state machine would be more ceremony than this needs (Chest and
    Cat don't use one either):

      'rising'    - climbs straight up from wherever it was launched until
                    it reaches `targetY`, drawing `riseImage` as a static
                    picture (no animation yet - it hasn't gone off).
      'exploding' - sits at targetY and plays `explodeAnimator` for
                    EXPLOSION_DURATION_MS, then sets alive = false so this
                    entity stops updating/drawing for good.

    Nothing currently removes dead entities from level.entities (nothing
    does that for Chest either), so a finished rocket relies on the same
    "if (!this.alive) return" early-out the rest of the engine already uses
    elsewhere to make a dead entity effectively inert rather than actually
    gone from the array.

    riseImage and explodeAnimator are left null here and assigned from
    outside right after construction - identical to how PlayScene.enter()
    hands each Cat its own `animator` instead of Cat loading its own image/
    json. Keeps Firework itself asset-agnostic; it doesn't know or care
    WHERE its sprite came from.

    ASSUMPTION worth flagging: this calls `explodeAnimator.update(dt)` to
    advance its frames, matching the update(dt, ...) convention every other
    system in this engine already follows - I don't have Animator.js, so if
    it advances frames some other way, that's the one line in this file to
    change.
*/
import Entity from "./Entity.js";
import Vector2 from "../../engine/core/Vector2.js";

const RISE_SPEED = 250;              // px/sec while climbing - tune to taste
const RISE_DISTANCE = 140;          // px above its OWN launch point, not a fixed world Y - so it looks right whether she's on a high platform or down low. Swap targetY below for an absolute Y coordinate instead if a fixed screen height is what's actually wanted.
const EXPLOSION_DURATION_MS = 1000; // how long the burst animation stays on screen - a plain duration, same idea as Chest's showMessage toast duration, not tied to however many frames explodeAnimator happens to have

export default class Firework extends Entity {
    constructor(x, y) {
        super();
        this.position = new Vector2(x, y);
        this.size = { width: 16, height: 16 }; // placeholder box until real firework art dimensions exist - matches Chest's own "no art yet" note
        this.tags.add('firework');

        this.targetY = y - RISE_DISTANCE;
        this.phase = 'rising'; // 'rising' -> 'exploding' -> alive = false
        this.explodeElapsedMs = 0;

        // Assigned by PlayScene right after `new Firework(...)` - see its update().
        this.riseImage = null;
        this.explodeAnimator = null;
    }

    update(dt, world) {
        if (!this.alive) return; // already finished exploding - nothing left to do, ever, for this instance

        if (this.phase === 'rising') {
            this.position.y -= RISE_SPEED * dt;
            if (this.position.y <= this.targetY) {
                this.position.y = this.targetY; // clamp instead of overshoot - without this it could drift a few px past targetY depending on dt/frame timing
                this.phase = 'exploding';
                this.explodeAnimator?.play('explode'); // assumes the explosion spritesheet's JSON names its clip "explode" - rename here to match whatever the real asset uses
            }
            return;
        }

        // phase === 'exploding'
        this.explodeAnimator?.update(dt);
        this.explodeElapsedMs += dt * 1000;
        if (this.explodeElapsedMs >= EXPLOSION_DURATION_MS) {
            this.alive = false;
        }
    }

    render(ctx, camera) {
        if (!this.alive) return;

        if (this.phase === 'rising') {
            if (this.riseImage) {
                // riseImage (32x32) is bigger than this.size (16x16 placeholder
                // hitbox) - center it over the hitbox instead of drawing it
                // anchored at the hitbox's top-left corner, same centering idea
                // PlayScene uses for the player's sprite vs its hitbox.
                const offsetX = (this.riseImage.width - this.size.width) / 2;
                const offsetY = (this.riseImage.height - this.size.height) / 2;
                const screenX = Math.round(this.position.x - camera.x - offsetX);
                const screenY = Math.round(this.position.y - camera.y - offsetY);
                ctx.drawImage(this.riseImage, screenX, screenY);
            } else {
                const screenX = Math.round(this.position.x - camera.x);
                const screenY = Math.round(this.position.y - camera.y);
                ctx.fillStyle = '#f2c14e'; // visible fallback until real art is wired in, same reasoning as Chest's plain rectangle
                ctx.fillRect(screenX, screenY, this.size.width, this.size.height);
            }
            return;
        }

        // phase === 'exploding'
        // The explode spritesheet's frames (256x256) are WAY bigger than this
        // entity's 16x16 hitbox - without centering, drawImage anchors at
        // (screenX, screenY) and paints down-and-right from there, so the
        // whole burst would appear shifted off to the side instead of
        // centered on where the rocket actually popped. getCurrentFrame()
        // gives the real per-frame w/h so this works for any sheet, not just
        // this one.
        if (!this.explodeAnimator) return;
        const frame = this.explodeAnimator.getCurrentFrame();
        const offsetX = (frame.w - this.size.width) / 2;
        const offsetY = (frame.h - this.size.height) / 2;
        const screenX = Math.round(this.position.x - camera.x - offsetX);
        const screenY = Math.round(this.position.y - camera.y - offsetY);
        this.explodeAnimator.draw(ctx, screenX, screenY);
    }
}