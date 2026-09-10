// src/game/entites/Player.js
/* We will extened the Entity class to create a Player class which will have additional functionality specific to the player character */
import Entity from "./Entity.js";
import Vector2 from "../../engine/core/Vector2.js";
import FiniteStateMachine from "../states/FiniteStateMachine.js";
import { definePlayerStates } from "../states/playerStates.js"
import { PHYSICS } from "../config/constants.js"; // MOVE_SPEED, JUMP_VELOCITY, etc. live here, not as magic numbers
import { eventBus } from "../../engine/core/EventBus.js"; // used to announce death without Player needing to know who's listening (audio, HUD, etc.)

class Player extends Entity {
    constructor() {
        super(); // Call the parent class constructor to initialize the entity's details
        this.position = new Vector2(100, 100); // Set the player's initial position
        this.velocity = new Vector2(0, 0); // Set the player's initial velocity
        this.size = { width: 16, height: 16 }; // Set the player's size
        this.health = { current: 100, max: 100 }; // Player's current and max health
        this.tags.add("player"); // Add a tag to identify the player entity
        this.stateMachine = new FiniteStateMachine('idle'); // Player's behavior/animation state (idle, running, jumping, crouching...)
        definePlayerStates(this); // Register all of the player states 
        this.grounded = false; // Whether the player is currently standing on solid ground
        this.facing = 'right'; // Direction the player is facing - ONLY ever 'left' or 'right', never a state name
        this.coyoteTimer = 0.1; // Grace period after walking off a ledge where jump still works
        this.shootCooldown = 0.5; // Time until the player can shoot again
        this.invulnerableTimer = 0; // Time remaining where the player ignores damage

        // this.animator already exists (inherited from Entity as null) - main.js assigns it once the sprite finishes loading
    }

    // NOTE: 'input' is an INSTANCE of InputManager, created once in main.js
    // and passed down each frame - NOT called on the InputManager class itself.
    update(dt, world, input) {
        super.update(dt, world); // Call the parent class update method

        // --- Horizontal movement (independent of jump/crouch) 
        // Sprint is checked as a MODIFIER on top of the base direction, not its own
        // branch - that way "right" and "right + sprint" don't need to be duplicated
        // as separate cases, and sprint has no effect at all with no direction held.
        if (input.isKeyPressed('right')) {
            this.velocity.x = PHYSICS.MOVE_SPEED; // Move right at the shared move speed
            if (input.isKeyPressed('sprint')) {
                this.velocity.x = PHYSICS.MOVE_SPEED * PHYSICS.SPRINT_SPEED; // SPRINT_SPEED is a MULTIPLIER (1.2), not a standalone speed
            }
            this.facing = 'right'; // Update facing direction
        } else if (input.isKeyPressed('left')) {
            this.velocity.x = -PHYSICS.MOVE_SPEED; // Move left at the shared move speed
            if (input.isKeyPressed('sprint')) {
                this.velocity.x = -PHYSICS.MOVE_SPEED * PHYSICS.SPRINT_SPEED;
            }
            this.facing = 'left'; // Update facing direction
        } else {
            this.velocity.x = 0; // No horizontal input - stop
        }

        // --- Jumping (checked separately, so it can happen WHILE moving horizontally) ---
        if (input.isKeyPressed('jump') && this.grounded) {
            this.velocity.y = PHYSICS.JUMP_VELOCITY; // Apply upward velocity (negative = up)
            this.grounded = false; // No longer on the ground once jumping
            this.stateMachine.transition('jumping'); // Jumping is a STATE, not a facing direction
        }

        // --- Crouching (also checked separately - this is a state, not a velocity change) ---
        if (input.isKeyPressed('crouch') && this.grounded) {
            this.stateMachine.transition('crouching'); // enter crouch
        } else if (this.stateMachine.current === 'crouching') {
            // crouch key released (or no longer grounded) - stand back up
            this.stateMachine.transition(this.velocity.x !== 0 ? 'running' : 'idle');
        }

        // --- Idle/Running (only decided while grounded and NOT jumping/crouching this frame) ---
        // This has to be checked AFTER jump/crouch, and only takes effect if neither of those just fired,
        // otherwise it would immediately overwrite the 'jumping'/'crouching' transition we just made above.
        if (this.grounded &&
            this.stateMachine.current !== 'jumping' &&
            this.stateMachine.current !== 'crouching') {
            this.stateMachine.transition(this.velocity.x !== 0 ? 'running' : 'idle');
        }

        // ---  Gravity constantly pulls the player downward --- 
        this.velocity.y = Math.min(this.velocity.y + PHYSICS.GRAVITY * dt, PHYSICS.MAX_FALL_SPEED); 
        
        // --- Integrate position ONCE, after all velocity decisions above are made ---
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        // --- Death by falling out of the world ---
        // If the player falls past the bottom of the level (into a pit/gap with no floor
        // beneath it), there's no tile collision down there to ever catch them - they'd just
        // keep falling forever. So instead, the moment they cross the level's bottom edge,
        // send them back to the current checkpoint immediately.
        // There's no real checkpoint SYSTEM yet - world.respawnPoint is just wherever
        // Game.js currently considers "the checkpoint" (right now, always the level's
        // playerStart). Reading it through `world` instead of hardcoding it here means
        // this code doesn't need to change at all once real checkpoints exist later -
        // only what Game.js puts into respawnPoint will change.
        if (this.position.y > world.bounds.height) {
            this.respawn(world.respawnPoint);
            eventBus.emit('playerDied'); // lets audio/HUD/anything react without Player knowing about them
            return; // we just teleported - nothing below should run against the old (fallen) position this frame
        }

        // --- Clamp to the world's left/right edges so the player can never walk or be pushed
        //     past the level bounds - world.bounds comes from level-1.json's "bounds" field, NOT
        //     a hardcoded number, so this automatically fits whatever level is loaded. ---
        if (this.position.x < 0) {
            this.position.x = 0; // hit the LEFT edge - clamp back to it
            this.velocity.x = 0; // also kill horizontal velocity, otherwise the player keeps "pushing" into the wall every frame
        } else if (this.position.x + this.size.width > world.bounds.width) {
            this.position.x = world.bounds.width - this.size.width; // hit the RIGHT edge - clamp so the player's right side sits exactly on the border
            this.velocity.x = 0;
        }

        // --- Horizontal collision against the REAL tilemap (walls, cliffs, steps) ---
        // Without this, the world-bounds clamp above only stops the player at the far left/right
        // edges of the WHOLE level - it says nothing about solid tiles in between, so the player
        // would walk straight through the side of any cliff or wall (which is exactly the bug this
        // fixes). Same sweep idea as the vertical check below: look at the column just past
        // whichever edge is leading the movement, and stop dead at the first solid tile found
        // across the player's full height. This runs BEFORE the vertical sweep so that by the time
        // we check for landing, X is already resolved - otherwise a fall into a wall corner could
        // get resolved in the wrong order and let the player clip through the corner.
        {
            const tileSize = world.tilemap.tileSize;
            const LEDGE_TOLERANCE = 4; // px - ignore this many pixels at the player's feet when
                                        // sweeping horizontally. Without it, the instant the player's
                                        // rising/falling feet graze the height of a platform's top
                                        // surface, this check sees "solid tile in my row" and snaps
                                        // the player back in X - even though they're about to land
                                        // ON TOP of that same tile, not walk into its side. Shrinking
                                        // the swept region leaves that corner-height sliver for the
                                        // vertical (landing) check below to resolve instead.
            const topRow = Math.floor(this.position.y / tileSize);
            const bottomRow = Math.floor((this.position.y + this.size.height - 1 - LEDGE_TOLERANCE) / tileSize);

            if (this.velocity.x > 0) {
                // Moving right - check the column the player's right edge is trying to enter
                const rightCol = Math.floor((this.position.x + this.size.width) / tileSize);
                for (let row = topRow; row <= bottomRow; row++) {
                    if (world.tilemap.isSolid(rightCol, row)) {
                        this.position.x = rightCol * tileSize - this.size.width; // snap flush against the wall's left face
                        this.velocity.x = 0; // stop pushing into the wall
                        break; // one wall hit is enough - stop checking further rows
                    }
                }
            } else if (this.velocity.x < 0) {
                // Moving left - check the column the player's left edge is trying to enter
                const leftCol = Math.floor(this.position.x / tileSize);
                for (let row = topRow; row <= bottomRow; row++) {
                    if (world.tilemap.isSolid(leftCol, row)) {
                        this.position.x = (leftCol + 1) * tileSize; // snap flush against the wall's right face
                        this.velocity.x = 0;
                        break;
                    }
                }
            }
        }

        // --- Ground collision against the REAL tilemap, not a hardcoded floor number ---
        // The ground is many tiles thick (see level-1.json), not a single row. If we only checked
        // the row the player's feet land in AFTER moving, a fast fall could skip past the surface
        // entirely and land embedded several tiles deep, because that deeper row is ALSO solid.
        // So instead we SWEEP row-by-row from where the feet WERE last frame to where they're
        // TRYING to go this frame, and stop at the very first solid row we hit - that's the real
        // surface, no matter how thick the ground underneath it is.
        this.grounded = false; // assume airborne - only set true below if we actually land on something

        if (this.velocity.y >= 0) { // only resolve LANDING while moving down (or stationary) - never snap to ground mid-jump on the way up
            const tileSize = world.tilemap.tileSize;
            const bottomOfPlayer = this.position.y + this.size.height;
            const oldBottom = bottomOfPlayer - this.velocity.y * dt; // approx. where the feet were BEFORE this frame's move
            const newBottom = bottomOfPlayer; // where the feet are trying to go THIS frame

            const startRow = Math.floor(oldBottom / tileSize);
            const endRow = Math.floor(newBottom / tileSize);

            const leftCol = Math.floor(this.position.x / tileSize);
            const rightCol = Math.floor((this.position.x + this.size.width - 1) / tileSize); // -1 so a perfectly aligned right edge doesn't bleed into the next column

            for (let row = startRow; row <= endRow; row++) {
                if (world.tilemap.isSolid(leftCol, row) || world.tilemap.isSolid(rightCol, row)) {
                    this.position.y = row * tileSize - this.size.height; // snap to the FIRST solid row hit, i.e. the actual surface
                    this.velocity.y = 0; // stop falling
                    this.grounded = true; // player is now considered grounded (enables jumping)
                    break; // stop at the surface - don't keep checking rows further down
                }
            }
        }

        // --- Let the state machine run its own per-state logic (e.g. jumping -> falling, falling -> idle/running) ---
        this.stateMachine.update(dt);

        // --- Advance the animation timer, if an animator has been assigned yet ---
        // The '?.' guard matters: main.js loads the sprite asynchronously, so for a brief moment
        // right at startup, this update() could run before player.animator exists (it starts as null).
        this.animator?.update(dt);
    }

    // Teleports the player back to a given point (currently only used for the
    // fall-out-of-world death above) and resets everything that a mid-air/mid-motion
    // state could leave dangling - otherwise the player could respawn already falling
    // at terminal velocity, or stuck in a 'jumping' animation while standing still.
    respawn(point) {
        this.position.x = point.x;
        this.position.y = point.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.grounded = false;
        this.stateMachine.transition('idle');
    }
}

export default Player;