// src/game/entities/Cake.js
/*
    The birthday cake - a stationary interactable prop, same "player has to
    be standing close and press a key" shape Chest uses, except instead of
    handing over an item, ONE key now drives two separate things at once:
    a one-time batch of REAL, VISIBLE Firework entities (see PlayScene's
    'cakeTriggered' listener/pendingFireworks queue), and a 4-bite "eat the
    cake" sequence that ends with the cake removing itself from the level.

    Both are driven by the SAME `triggerKey` (default 'interact') - there's
    no separate eat key. Every valid in-range press counts as a bite
    (advancing the eating animation one frame); the FIRST valid press ALSO
    fires the firework batch, once, forever (see `this.triggered` below).
    Later presses just keep advancing the bite count.

    `spread` and `delay` control how far apart (px) and how far apart in
    TIME (ms) each rocket in that one batch launches, so "a bunch of
    fireworks" reads as a spread-out, one-after-another burst instead of N
    identical rockets stacked on the same pixel at the same instant. This
    file just passes both along on the trigger event - PlayScene's
    'cakeTriggered' listener (and its pendingFireworks queue) is what
    actually applies them. `this.triggered` guards this to firing exactly
    ONCE - a previous version of this file made it loop forever instead, as
    a sweeping scanning-bar; that's been reverted, this is back to a single
    batch.

    TWO SEPARATE SPRITES now, per the art: `this.sprite` (cake-sprite.png,
    4 frames at 256x256 each) is the ambient "not interacted with yet"
    candle-flicker loop, and `this.eatingSprite` (cake-eating-sprite.png,
    4 frames at 256x256 each - SAME frame size as the ambient sheet, both
    exported from the same 1024x256 layout) is what's drawn once she's
    taken at least one bite - see render(). Both are assigned by PlayScene
    right after construction (its cakeEntities block in enter()), same
    "entity is asset-agnostic, PlayScene hands it art" pattern Cat/Firework
    already use - Cake.js doesn't load its own images. Until sprite/
    eatingSprite are assigned (or if a fetch failed) render() falls back to
    a plain colored box, same reasoning as Chest/Firework's own
    placeholders.

    UNLIKE Cat, neither sprite goes through SpriteSheet/Animator - both are
    raw decoded images with a fixed, equal-width frame layout and no
    accompanying frameData JSON, so this file slices frame N out of
    whichever one is currently active manually instead.

    ASSUMPTION worth flagging: `triggerKey` is checked with
    world.input.isKeyJustPressed(...), the same InputManager method
    PlayScene already calls for the 'fireworks' key - I don't have
    InputManager.js, so if key names are registered/checked some other
    way, this is the one line to change. Default triggerKey is 'interact',
    which is NOT currently a registered key anywhere I can see - it needs
    to exist in InputManager for this to do anything in-game. The
    world-builder editor's "Trigger key" field lets this be repointed at
    whatever key name actually exists, per-cake, without touching this
    file.

    FIXED: EATING_FRAME_SIZE was 32, but cake-eating-sprite.png is actually
    1024x256 - 4 frames of 256x256 each, exactly like cake-sprite.png (the
    art was re-exported at some point and this constant never got updated
    to match). With it at 32, render() was slicing a 32x32 corner out of
    each real 256x256 frame - for frame 0 that's just blank/transparent
    padding around the cake art, which is why the cake appeared to vanish
    the instant a bite landed instead of showing the eaten-cake frames.
*/
import Entity from "./Entity.js";
import Vector2 from "../../engine/core/Vector2.js";

const INTERACT_RANGE = 24;        // px - how close her hitbox's center has to get before triggerKey does anything; tune to taste once real cake art gives a sense of scale
const FRAME_COUNT = 4;            // both sprite sheets have exactly 4 frames - also doubles as the total number of bites before the cake is gone, see update()
const CANDLE_FRAME_SIZE = 256;    // source px per frame in cake-sprite.png (the ambient, not-yet-eaten sheet), both width and height
const EATING_FRAME_SIZE = 256;    // source px per frame in cake-eating-sprite.png (the eating sheet), both width and height - FIXED, was 32; actual sheet is 1024x256 (4 frames @ 256x256), same layout as the ambient sheet
const FRAME_INTERVAL_MS = 150;    // how long each candle-flicker frame stays up before advancing - ambient only, stops for good once eating starts, see update()
const DRAW_SIZE = 48;             // on-screen px each (square) source frame gets scaled to, same for both sheets

export default class Cake extends Entity {
    constructor(x, y, fireworkCount = 6, triggerKey = 'interact', spread = 40, delay = 300) {
        super();
        this.position = new Vector2(x, y);
        this.size = { width: 16, height: 16 }; // placeholder HITBOX (interact range is centered on this) - the drawn art is bigger, see render()
        this.tags.add('cake');

        this.fireworkCount = fireworkCount; // how many rockets in the one-time batch
        this.triggerKey = triggerKey;       // fires the batch AND advances eating - see update()
        this.spread = spread;               // px between each rocket in that batch
        this.delay = delay;                 // ms between each rocket's launch in that batch
        this.triggered = false;             // true once the batch has fired - guards it to exactly once, forever after

        // Assigned by PlayScene right after `new Cake(...)`, same as
        // Firework gets riseImage/explodeAnimator handed to it from
        // outside instead of loading its own assets. null is a valid
        // "no art yet" state here, not an error - render() falls back to
        // a rectangle instead of crashing on it.
        this.sprite = null;       // cake-sprite.png - ambient, not-yet-eaten candle loop
        this.eatingSprite = null; // NEW - cake-eating-sprite.png - shown once bitesTaken > 0

        // Candle-flicker animation state - only advances while
        // bitesTaken === 0 (see update()). Plain frame-index + elapsed-ms
        // timer, same "too small to need FiniteStateMachine" reasoning
        // Firework.js already gives for its own rising/exploding phase
        // tracking.
        this.frameIndex = 0;
        this.frameElapsedMs = 0;

        // NEW - how many valid triggerKey presses have landed. 0 = still
        // showing the ambient candle loop. 1-3 = showing that frame of the
        // eating sheet. Hits FRAME_COUNT (4) => cake marks itself dead -
        // see update() and PlayScene's dead-entity filter at the top of
        // its own update().
        this.bitesTaken = 0;
    }

    update(dt, world) {
        // Ambient candle flicker - the cake's default look, before she's
        // ever interacted with it. Stops for good the instant the first
        // bite lands (bitesTaken > 0), since render() switches over to the
        // separate eating sheet from then on - a timer-driven flicker and
        // a press-driven bite frame would otherwise fight over the same
        // frameIndex.
        if (this.bitesTaken === 0) {
            this.frameElapsedMs += dt * 1000;
            if (this.frameElapsedMs >= FRAME_INTERVAL_MS) {
                this.frameElapsedMs -= FRAME_INTERVAL_MS;
                this.frameIndex = (this.frameIndex + 1) % FRAME_COUNT;
            }
        }

        if (this.bitesTaken >= FRAME_COUNT) return; // fully eaten - alive is already false, nothing left to check while PlayScene finishes removing it

        // Center-to-center distance check, not an AABB overlap - a cake is
        // meant to be "walked up to and interacted with" rather than
        // "walked into", so this is deliberately a looser radius check
        // instead of getAABB()/intersects() like CollisionSystem uses for
        // solid bodies.
        const px = world.player.position.x + world.player.size.width / 2;
        const py = world.player.position.y + world.player.size.height / 2;
        const cx = this.position.x + this.size.width / 2;
        const cy = this.position.y + this.size.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        const inRange = (dx * dx + dy * dy) <= INTERACT_RANGE * INTERACT_RANGE;

        if (!(inRange && world.input.isKeyJustPressed(this.triggerKey))) return;

        // Fireworks fire exactly once, on whichever press is the FIRST
        // valid one - `this.triggered` blocks it forever after.
        if (!this.triggered) {
            this.triggered = true;
            // PlayScene owns level.entities, not this file (same reasoning
            // as Chest emitting 'chestOpened' instead of reaching into
            // inventory/messageBox itself) - this just announces "here's a
            // batch", and PlayScene's existing 'cakeTriggered' listener/
            // pendingFireworks queue does the actual spawning, spread out
            // over time using `spread`/`delay`, completely unchanged from
            // before.
            world.events.emit('cakeTriggered', {
                fireworkCount: this.fireworkCount,
                spread: this.spread,
                delay: this.delay,
                x: cx,
                y: this.position.y,
            });
        }

        // Every valid press ALSO counts as a bite - including this first
        // one - switching the rendered frame over to the eating sheet (see
        // render()). After the 4th, the cake marks itself dead; PlayScene
        // drops it from level.entities at the top of its NEXT update(),
        // which is what lets this final frame still get drawn once before
        // it actually disappears.
        this.bitesTaken++;
        this.frameIndex = this.bitesTaken - 1;
        if (this.bitesTaken >= FRAME_COUNT) {
            this.alive = false;
        }
    }

    render(ctx, camera) {
        const screenX = Math.round(this.position.x - camera.x);
        const screenY = Math.round(this.position.y - camera.y);

        // Once she's taken at least one bite, draw from the eating sheet
        // instead of the candle sheet - two different images for two
        // different states (see class header).
        const eating = this.bitesTaken > 0;
        const sprite = eating ? this.eatingSprite : this.sprite;
        const frameSize = eating ? EATING_FRAME_SIZE : CANDLE_FRAME_SIZE;

        if (sprite) {
            // The real art (DRAW_SIZE, currently 48x48) is bigger than the
            // 16x16 hitbox - centered horizontally over it and anchored so
            // the BOTTOM of the drawn frame sits on the hitbox's bottom
            // edge, same "position is her feet, art can be taller/wider"
            // convention Firework already uses for its rocket/explosion
            // frames.
            const sx = this.frameIndex * frameSize;
            const dx = screenX + this.size.width / 2 - DRAW_SIZE / 2;
            const dy = screenY + this.size.height - DRAW_SIZE;
            ctx.drawImage(sprite, sx, 0, frameSize, frameSize, dx, dy, DRAW_SIZE, DRAW_SIZE);
        } else {
            ctx.fillStyle = '#ffb6d9'; // visible fallback until the active sprite has actually loaded, same reasoning as Chest/Firework's own placeholder rectangles
            ctx.fillRect(screenX, screenY, this.size.width, this.size.height);
        }
    }
}