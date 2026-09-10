// src/game/entities/Cake.js
/*
    The birthday cake - a stationary interactable prop, same "player has to
    be standing close and press a key" shape Chest presumably already uses,
    except pressing the key doesn't hand over an item: it fires off a whole
    batch of REAL, VISIBLE Firework entities (see PlayScene's
    'cakeTriggered' listener), which is what the request actually asked
    for - "press a button, a bunch of fireworks go off".

    `spread` and `delay` control how far apart (px) and how far apart in
    TIME (ms) each rocket in that batch launches, so a "bunch" reads as a
    spread-out, one-after-another burst instead of N identical rockets
    stacked on the same pixel at the same instant. This file just passes
    both along on the trigger event - PlayScene's 'cakeTriggered' listener
    (and its pendingFireworks queue) is what actually applies them.

    Comes from the world-builder editor's "Cake" entity kind - see
    BirthdayScene.js's `cake` factory, which reads fireworkCount/
    triggerKey/spread/delay straight off the level JSON the same way
    messageZone already reads its own `message`.

    `spread` and `delay` control how far apart (px) and how far apart in
    TIME (ms) each rocket launches. Originally these described one single
    batch; now (see UPDATED note below) they describe the step size and
    interval of a CONTINUOUS sweep instead.

    Comes from the world-builder editor's "Cake" entity kind - see
    BirthdayScene.js's `cake` factory, which reads fireworkCount/
    triggerKey/spread/delay/range straight off the level JSON the same way
    messageZone already reads its own `message`.

    UPDATED: this used to fire exactly ONE batch of `fireworkCount` rockets
    and then go permanently quiet (`this.triggered` blocked it forever).
    Now, once lit, it never stops: every `delay` ms it launches a single
    Firework at a point that sweeps back and forth, `spread` px per step,
    like a scanning bar - never going further than `range` px to either
    side of the cake. When the sweep reaches that edge it just reverses
    direction instead of stopping, so it pings back the other way forever.
    `fireworkCount` is kept around (existing level JSON already has it, and
    BirthdayScene's factory still reads it) but is no longer used now that
    the cake doesn't fire in fixed one-off batches - a single continuous
    sweep replaces "how many rockets in the batch".

    `this.triggered` still means "the key's been pressed, the loop has
    started" - it just no longer blocks anything once true, it's what
    switches update() over into running the sweep instead of watching for
    the key press.

    `cake.sprite` is assigned by PlayScene right after construction (see
    its cakeEntities block in enter()), the same "entity is asset-agnostic,
    PlayScene hands it art" pattern Cat/Firework already use - Cake.js
    doesn't load its own image. Until that assignment happens (or if it
    never does, e.g. the fetch failed) it renders as a plain colored box,
    same reasoning as Chest/Firework's own placeholder rectangles.

    UNLIKE Cat, this does NOT go through SpriteSheet/Animator - the sprite
    handed to it is the raw decoded cake-sprite.png, a plain 1024x256 sheet
    of 4 equal 256x256 frames with no accompanying frameData JSON (there's
    no named-clips concept here, just one continuous flicker loop), so this
    file slices frame N out of it manually instead. If a real frameData
    JSON gets authored for this art later, swap this for SpriteSheet/
    Animator like Cat uses - this manual version is only here because
    there's nothing to feed Animator yet.

    ASSUMPTION worth flagging: 'triggerKey' is checked with
    world.input.isKeyJustPressed(...), the same InputManager method
    PlayScene already calls for the 'fireworks' key - I don't have
    InputManager.js, so if key names are registered/checked some other way,
    this is the one line to change. Default triggerKey is 'interact', which
    is NOT currently a registered key anywhere I can see - it (or whatever
    name is used instead) needs to exist in InputManager for this to do
    anything in-game. The world-builder editor's "Trigger key" field lets
    this be repointed at whatever key name actually exists, per-cake,
    without touching this file.
*/
import Entity from "./Entity.js";
import Vector2 from "../../engine/core/Vector2.js";

const INTERACT_RANGE = 24;    // px - how close her hitbox's center has to get before the trigger key does anything; tune to taste once real cake art gives a sense of scale
const FRAME_COUNT = 4;        // cake-sprite.png is 4 equal frames side by side (see PlayScene's cakeSpriteImagePath)
const FRAME_SIZE = 256;       // source px per frame, both width and height (1024 / 4 = 256, and the sheet is 256 tall)
const FRAME_INTERVAL_MS = 150; // how long each frame stays up before advancing - a plain ambient loop, tune to taste
const DRAW_SIZE = 48;         // on-screen px the (square) source frame gets scaled down to

export default class Cake extends Entity {
    constructor(x, y, fireworkCount = 6, triggerKey = 'interact', spread = 40, delay = 300, range = 160) {
        super();
        this.position = new Vector2(x, y);
        this.size = { width: 16, height: 16 }; // placeholder HITBOX (interact range is centered on this) - the drawn art is bigger, see render()
        this.tags.add('cake');

        this.fireworkCount = fireworkCount; // kept for level-JSON/factory compatibility - no longer used, see class header
        this.triggerKey = triggerKey;
        this.spread = spread; // NOW the sweep's step size (px moved per launch), not a one-batch spacing - see update()
        this.delay = delay;   // ms between each launch in the continuous sweep
        this.range = range;   // NEW - max px the sweep point can travel from the cake's center before it reverses direction ("won't go further than this")
        this.triggered = false; // true once the key's been pressed - from then on update() runs the sweep loop instead of watching for the key

        // NEW - sweep state, only meaningful once `triggered` is true.
        // centerX is captured once at trigger time (the cake never moves,
        // so this is just its own center - computed once instead of every
        // frame). sweepOffset is the current signed distance from centerX;
        // sweepDirection flips between +1/-1 each time the sweep hits
        // +-range, which is what makes it ping-pong instead of wrapping or
        // stopping.
        this.centerX = 0;
        this.sweepOffset = 0;
        this.sweepDirection = 1;
        this.elapsedSinceLaunch = 0;

        // Assigned by PlayScene right after `new Cake(...)`, identical to
        // how Firework gets riseImage/explodeAnimator handed to it from
        // outside instead of loading its own assets. null is a valid
        // "no art yet" state here, not an error - render() below falls
        // back to a rectangle instead of crashing on it.
        this.sprite = null;

        // Candle-flicker animation state - see update()/render(). Plain
        // frame-index + elapsed-ms timer, same "too small to need
        // FiniteStateMachine" reasoning Firework.js already gives for its
        // own rising/exploding phase tracking - this only ever has ONE
        // loop, never a transition between named states.
        this.frameIndex = 0;
        this.frameElapsedMs = 0;
    }

    update(dt, world) {
        // The candle keeps flickering regardless of whether she's triggered
        // the fireworks yet - it's ambient art, not tied to `triggered`.
        this.frameElapsedMs += dt * 1000;
        if (this.frameElapsedMs >= FRAME_INTERVAL_MS) {
            this.frameElapsedMs -= FRAME_INTERVAL_MS;
            this.frameIndex = (this.frameIndex + 1) % FRAME_COUNT;
        }

        if (this.triggered) {
            // Already lit - run the continuous scanning-bar sweep forever
            // (see class header). This intentionally never sets `triggered`
            // back to false and never returns to the "watch for the key"
            // branch below - once lit, a birthday candle doesn't blow
            // itself back out.
            this.elapsedSinceLaunch += dt * 1000;
            if (this.elapsedSinceLaunch >= this.delay) {
                this.elapsedSinceLaunch -= this.delay; // subtract (not reset to 0) so a slow frame doesn't drift the interval's timing over a long session

                // PlayScene owns level.entities, not this file (same
                // reasoning as Chest emitting 'chestOpened' instead of
                // reaching into inventory/messageBox itself) - this just
                // announces "one rocket, launch it here" and PlayScene's
                // existing 'cakeTriggered' listener/pendingFireworks queue
                // does the actual spawning, completely unchanged - a
                // fireworkCount of 1 with spread/delay of 0 was already a
                // valid (if previously unused) shape for that payload.
                world.events.emit('cakeTriggered', {
                    fireworkCount: 1,
                    spread: 0,
                    delay: 0,
                    x: this.centerX + this.sweepOffset,
                    y: this.position.y,
                });

                // Advance the sweep point, then clamp+reverse at the edges
                // instead of letting it run past `range` - this is the
                // "won't go further than X, then pings back" behavior.
                this.sweepOffset += this.spread * this.sweepDirection;
                if (this.sweepOffset >= this.range) {
                    this.sweepOffset = this.range;
                    this.sweepDirection = -1;
                } else if (this.sweepOffset <= -this.range) {
                    this.sweepOffset = -this.range;
                    this.sweepDirection = 1;
                }
            }
            return; // nothing else to check once the loop's running
        }

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

        if (inRange && world.input.isKeyJustPressed(this.triggerKey)) {
            this.triggered = true;
            this.centerX = cx;
            this.sweepOffset = 0;
            this.sweepDirection = 1;
            // Starting at `this.delay` (not 0) means the first rocket of the
            // loop fires on the very next update() rather than making her
            // wait a full `delay` ms after pressing the key for anything to
            // happen.
            this.elapsedSinceLaunch = this.delay;
        }
    }

    render(ctx, camera) {
        const screenX = Math.round(this.position.x - camera.x);
        const screenY = Math.round(this.position.y - camera.y);

        if (this.sprite) {
            // The real art (DRAW_SIZE, currently 48x48) is bigger than the
            // 16x16 hitbox - centered horizontally over it and anchored so
            // the BOTTOM of the drawn frame sits on the hitbox's bottom
            // edge, same "position is her feet, art can be taller/wider"
            // convention Firework already uses for its rocket/explosion
            // frames.
            const sx = this.frameIndex * FRAME_SIZE;
            const dx = screenX + this.size.width / 2 - DRAW_SIZE / 2;
            const dy = screenY + this.size.height - DRAW_SIZE;
            ctx.drawImage(this.sprite, sx, 0, FRAME_SIZE, FRAME_SIZE, dx, dy, DRAW_SIZE, DRAW_SIZE);
        } else {
            ctx.fillStyle = '#ffb6d9'; // visible fallback until the sprite has actually loaded, same reasoning as Chest/Firework's own placeholder rectangles
            ctx.fillRect(screenX, screenY, this.size.width, this.size.height);
        }
    }
}