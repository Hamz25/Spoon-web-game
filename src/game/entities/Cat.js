// src/game/entities/Cat.js
/*
    The birthday cat! She just sits still somewhere further down the path
    at first - the player has to actually walk up and find her, which is
    the whole point of putting her a bit of a walk away from the start
    instead of right next to the player. The moment the player gets close
    enough for the FIRST time, she "reveals" herself with a "Pet the
    kitty" message that just sits on screen (it doesn't auto-hide - see
    the duration:0 below) until she's actually been pet. After that, she
    switches into 'following' mode and just... tags along behind the
    player from then on.

    Re-uses the same FiniteStateMachine class Player.js already uses for
    idle/running/jumping/etc - same tool, just three much simpler states
    this time: waiting -> found -> following.

    UPDATED: 'following' used to just lerp position.x AND position.y
    straight at the player every frame - no gravity, no ground collision,
    so she'd fly/float over gaps and slopes. She now has the same
    gravity + tilemap collision shape as Player (velocity.y, grounded,
    horizontal/vertical sweeps against world.tilemap), only ever sets
    velocity directly and lets physics move position - plus simple
    ledge/wall lookahead so she jumps instead of walking into a gap or a
    step, and a teleport fallback if she ever falls too far behind.
*/
import Entity from "./Entity.js";
import Vector2 from "../../engine/core/Vector2.js";
import FiniteStateMachine from "../states/FiniteStateMachine.js";
import { intersects } from "../../engine/physics/AABB.js";
import { PHYSICS } from "../config/constants.js"; // reuse the SAME gravity/jump numbers Player uses, so she falls/jumps consistently with everything else in the world

const DISCOVER_RANGE = 40;       // px - how close the player needs to get before the cat notices them and reveals herself
const INTERACT_RANGE = 20;       // px - same "breathing room" idea as Chest.js's INTERACT_RANGE, for actually petting her
const FOLLOW_SPEED = 140;        // px/s - a little SLOWER than the player's own MOVE_SPEED (180, see constants.js) on purpose, so she trails behind instead of overtaking or walking on top of the player
const FOLLOW_STOP_DISTANCE = 18; // px - once she's this close (horizontally) to the spot she's chasing, just stop. Without this she'd jitter back and forth every frame trying to land on an exact pixel that keeps moving anyway
const TELEPORT_DISTANCE = 400;   // px - straight-line distance to the player at which we give up on walking/jumping and just snap her to the player instead (stuck on geometry, player sprinted way ahead, etc.)
const JUMP_LOOKAHEAD = 10;       // px - how far past her own edge she "looks" to decide whether there's a wall or a gap coming up
const GROUND_PROBE_DEPTH = 4;    // px - how far below her feet counts as "still standing on something" when checking for a ledge ahead

export default class Cat extends Entity {
    constructor(x, y) {
        super();
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.size = { width: 12, height: 10 }; // small cat, smaller than the player's 16x16 box - adjust once real cat art exists
        this.tags.add('cat');
        this.grounded = false; // whether she's currently standing on solid ground - same idea as Player.grounded
        this.facing = 'left';  // which way she's drawn facing - only ever 'left' or 'right', same convention as Player.facing. Base art in cat-sprite.png faces LEFT, so this gets passed to animator.draw() as flipX = (facing === 'right'), exactly like Player does

        this.stateMachine = new FiniteStateMachine('waiting');
        this.#defineStates();

        // NOT set here on purpose - PlayScene.enter() assigns this.animator
        // once cat-sprite.png/json finish loading (see the 'cat' tag check
        // there), same pattern as Player. Stays null/undefined until then,
        // which is why update()/render() below both guard with `this.animator?.`.
    }

    #interactAABB() {
        const box = this.getAABB();
        return {
            x: box.x - DISCOVER_RANGE,
            y: box.y - DISCOVER_RANGE,
            width: box.width + DISCOVER_RANGE * 2,
            height: box.height + DISCOVER_RANGE * 2,
        };
    }
    #petAABB() {
        const box = this.getAABB();
        return {
            x: box.x - INTERACT_RANGE,
            y: box.y - INTERACT_RANGE,
            width: box.width + INTERACT_RANGE * 2,
            height: box.height + INTERACT_RANGE * 2,
        };
    }

    // Only defines WHAT happens the instant we transition into each state
    // (onEnter) - none of these need onUpdate, because deciding WHEN to
    // leave a state is handled explicitly in update() below instead. That
    // split keeps "what does this state DO" (here) separate from "when do
    // we change state" (update()), same division Player's states/update()
    // already have.
    #defineStates() {
        this.stateMachine.add('waiting', {}); // does nothing at all - just sits there until update() notices the player is close

        this.stateMachine.add('found', {
            onEnter: () => {
                // duration: 0 means this message has no auto-hide timer - it
                // stays up until something else replaces it, which naturally
                // happens the moment 'following' below fires its own message.
                this.events.emit('showMessage', { text: 'Press E to pet the cat', duration: 0 });
            },
        });

        this.stateMachine.add('following', {
            onEnter: () => {
                this.events.emit('showMessage', { text: 'You are really loved by cats I see', duration: 2500 });
            },
        });
    }

    // Is there solid ground under world-x `worldX`, close enough below her
    // current feet level to still count as "ground" there? Used to look a
    // little bit ahead of her own feet and decide if the next step is a
    // ledge/gap rather than solid floor.
    #groundAheadAt(worldX, tilemap) {
        const tileSize = tilemap.tileSize;
        const col = Math.floor(worldX / tileSize);
        const row = Math.floor((this.position.y + this.size.height + GROUND_PROBE_DEPTH) / tileSize);
        return tilemap.isSolid(col, row);
    }

    // Is there a solid wall blocking her at chest-height in the direction
    // she's about to move? `dirSign` is +1 (moving right) or -1 (moving left).
    #wallAheadInDirection(dirSign, tilemap) {
        const tileSize = tilemap.tileSize;
        const probeX = dirSign > 0
            ? this.position.x + this.size.width + JUMP_LOOKAHEAD
            : this.position.x - JUMP_LOOKAHEAD;
        const col = Math.floor(probeX / tileSize);
        const topRow = Math.floor(this.position.y / tileSize);
        const bottomRow = Math.floor((this.position.y + this.size.height - 1) / tileSize);
        for (let row = topRow; row <= bottomRow; row++) {
            if (tilemap.isSolid(col, row)) return true;
        }
        return false;
    }

    // Should she jump right now to keep following? Only ever called while
    // grounded (can't jump mid-air anyway) - true if there's either a wall
    // in front of her, or the ground just drops away ahead of her feet.
    #shouldJump(dirSign, tilemap) {
        if (!this.grounded) return false;
        if (this.#wallAheadInDirection(dirSign, tilemap)) return true;

        const probeX = dirSign > 0
            ? this.position.x + this.size.width + JUMP_LOOKAHEAD
            : this.position.x - JUMP_LOOKAHEAD;
        return !this.#groundAheadAt(probeX, tilemap);
    }

    // Snap straight to a spot next to the player and wipe velocity - the
    // "I give up walking/jumping there, just appear next to you" fallback.
    // Used both when she falls too far behind AND if she ever falls out of
    // the world entirely (mirrors Player.respawn's spirit, just no checkpoint).
    #teleportToPlayer(player) {
        const behindOffset = player.facing === 'right' ? -16 : 16;
        this.position.x = player.position.x + behindOffset;
        this.position.y = player.position.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.grounded = false;
    }

    // Shared physics step: gravity, horizontal collision, vertical
    // (ground) collision - same shape as the equivalent blocks in
    // Player.update(), just trimmed down to what a simple companion needs
    // (no world-bounds clamping/death - she's never meant to be the one
    // the level plays "around").
    #applyPhysics(dt, world) {
        const tilemap = world.tilemap;
        const tileSize = tilemap.tileSize;

        // --- Gravity, same curve as the player ---
        this.velocity.y = Math.min(this.velocity.y + PHYSICS.GRAVITY * dt, PHYSICS.MAX_FALL_SPEED);

        // --- Integrate position once, after velocity is finalized for the frame ---
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        // --- Horizontal collision against the tilemap (walls) ---
        const LEDGE_TOLERANCE = 4; // px - same reasoning as Player's: leave a sliver at the feet for the vertical check to resolve landings instead of this snapping her in X
        const topRow = Math.floor(this.position.y / tileSize);
        const bottomRow = Math.floor((this.position.y + this.size.height - 1 - LEDGE_TOLERANCE) / tileSize);

        if (this.velocity.x > 0) {
            const rightCol = Math.floor((this.position.x + this.size.width) / tileSize);
            for (let row = topRow; row <= bottomRow; row++) {
                if (tilemap.isSolid(rightCol, row)) {
                    this.position.x = rightCol * tileSize - this.size.width;
                    this.velocity.x = 0;
                    break;
                }
            }
        } else if (this.velocity.x < 0) {
            const leftCol = Math.floor(this.position.x / tileSize);
            for (let row = topRow; row <= bottomRow; row++) {
                if (tilemap.isSolid(leftCol, row)) {
                    this.position.x = (leftCol + 1) * tileSize;
                    this.velocity.x = 0;
                    break;
                }
            }
        }

        // --- Vertical collision against the tilemap (ground) ---
        this.grounded = false;

        if (this.velocity.y >= 0) {
            const bottomOfCat = this.position.y + this.size.height;
            const oldBottom = bottomOfCat - this.velocity.y * dt;
            const newBottom = bottomOfCat;

            const startRow = Math.floor(oldBottom / tileSize);
            const endRow = Math.floor(newBottom / tileSize);

            const leftCol = Math.floor(this.position.x / tileSize);
            const rightCol = Math.floor((this.position.x + this.size.width - 1) / tileSize);

            for (let row = startRow; row <= endRow; row++) {
                if (tilemap.isSolid(leftCol, row) || tilemap.isSolid(rightCol, row)) {
                    this.position.y = row * tileSize - this.size.height;
                    this.velocity.y = 0;
                    this.grounded = true;
                    break;
                }
            }
        }

        // --- Safety net: if she somehow falls out of the level entirely
        //     (fell into a pit with no floor under it), don't let her fall
        //     forever - just pop her back to the player. ---
        if (world.bounds && this.position.y > world.bounds.height) {
            this.#teleportToPlayer(world.player);
        }
    }

    update(dt, world) {
        const { player, events } = world;
        this.events = events; // stashed on `this` so the onEnter callbacks above can reach the event bus without FiniteStateMachine needing to pass arguments into every state hook

        if (this.stateMachine.current === 'waiting') {
            this.velocity.x = 0; // she never walks in this state - only gravity/ground collision should ever move her
            if (intersects(this.#interactAABB(), player.getAABB())) {
                this.stateMachine.transition('found');
            }
            this.animator?.play('idle');
            this.#applyPhysics(dt, world); // keeps her sitting properly on the ground even if her authored spawn point isn't pixel-perfect on a tile surface
            this.animator?.update(dt);
            return;
        }

        if (this.stateMachine.current === 'found') {
            this.velocity.x = 0; // still just sitting there until she's actually been pet
            const closeEnoughToPet = intersects(this.#petAABB(), player.getAABB());
            if (closeEnoughToPet && world.input.isKeyJustPressed('interact')) {
                this.stateMachine.transition('following');
            }
            this.animator?.play('idle');
            this.#applyPhysics(dt, world);
            this.animator?.update(dt);
            return;
        }

        // stateMachine.current === 'following' from here down
        // Chase a spot just BEHIND the player - based on which way the player
        // is currently facing - rather than the player's exact position.
        // Aiming straight at player.position would make her walk right on
        // top of the player instead of trailing behind like a companion.
        const behindOffset = player.facing === 'right' ? -16 : 16;
        const targetX = player.position.x + behindOffset;

        // Straight-line distance (not just X) decides the teleport fallback -
        // covers the player sprinting far ahead OR being far above/below
        // (e.g. cat stuck on a lower platform she can't path off of).
        const dxToPlayer = player.position.x - this.position.x;
        const dyToPlayer = player.position.y - this.position.y;
        const distanceToPlayer = Math.hypot(dxToPlayer, dyToPlayer);

        if (distanceToPlayer > TELEPORT_DISTANCE) {
            this.#teleportToPlayer(player);
            return; // just teleported - nothing this frame should move her further
        }

        const dx = targetX - this.position.x;
        if (Math.abs(dx) > FOLLOW_STOP_DISTANCE) {
            const dirSign = Math.sign(dx);
            this.velocity.x = dirSign * FOLLOW_SPEED;
            this.facing = dirSign > 0 ? 'left' : 'right'; // face whichever way she's actually walking, same idea as Player.facing

            if (this.#shouldJump(dirSign, world.tilemap)) {
                this.velocity.y = PHYSICS.JUMP_VELOCITY;
                this.grounded = false;
            }
        } else {
            this.velocity.x = 0; // close enough - stop walking, but gravity/collision below still applies
        }

        // Only animate a walk cycle while she's ACTUALLY moving horizontally -
        // if she's caught up to her stop distance she should look like she's
        // standing/sitting, not mid-stride. velocity.x here reflects the
        // decision above, from BEFORE the horizontal collision sweep in
        // #applyPhysics might zero it out again (e.g. she just bumped a wall
        // this exact frame) - that's fine, one frame of "walk" pose while
        // stopped against a wall isn't noticeable and matches how Player's
        // own running/idle state check works (decided from intent, not the
        // post-collision result).
        this.animator?.play(this.velocity.x !== 0 ? 'walk' : 'idle');

        this.#applyPhysics(dt, world);
        this.animator?.update(dt);
    }

    // Draws her current animation frame, centered horizontally and
    // bottom-aligned over her actual hitbox - same idea as PlayScene.render()
    // does for the player, except computed fresh from the CURRENT frame's
    // real size every call instead of a single fixed constant, because
    // unlike the player's sheet, the cat's frames aren't all the same
    // dimensions (a walking pose is wider than a sitting one). Falls back to
    // the old placeholder rectangle if the sprite hasn't loaded yet (or
    // failed to) - keeps her visible instead of silently disappearing.
    render(ctx, camera) {
        if (!this.animator) {
            const screenX = Math.round(this.position.x - camera.x);
            const screenY = Math.round(this.position.y - camera.y);
            ctx.fillStyle = this.stateMachine.current === 'waiting' ? '#e07a3f' : '#f2994a';
            ctx.fillRect(screenX, screenY, this.size.width, this.size.height);
            return;
        }

        const frame = this.animator.getCurrentFrame();
        const offsetX = (frame.w - this.size.width) / 2; // center the (usually wider) art over the hitbox
        const offsetY = frame.h - this.size.height;       // bottom-align so her feet sit on the ground instead of the art's vertical center

        const screenX = Math.round(this.position.x - camera.x - offsetX);
        const screenY = Math.round(this.position.y - camera.y - offsetY);

        this.animator.draw(ctx, screenX, screenY, this.facing === 'right'); // same flipX convention as Player: base art faces left, flip when facing right
    }
}