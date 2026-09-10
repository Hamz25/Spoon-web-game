// src/game/entities/MessageZone.js
/*
    An invisible rectangle placed somewhere along the level. It has no
    sprite and isn't solid - the player just walks straight through it -
    but the very first time her hitbox overlaps it, a little message pops
    up. This is the "the more she moves, the more messages appear" part:
    scatter a handful of these along the walking path and a new line
    reveals itself every so often as she makes her way through the level.

    One-shot on purpose (see `triggered`) - wandering back and forth over
    the same spot re-showing the same line forever would get old fast.
*/
import Entity from "./Entity.js";
import Vector2 from "../../engine/core/Vector2.js";
import { intersects } from "../../engine/physics/AABB.js";

export default class MessageZone extends Entity {
    constructor(x, y, message, width = 32, height = 32) {
        super();
        this.position = new Vector2(x, y);
        this.size = { width, height }; // bigger than a normal small object on purpose - this is a trigger AREA, it should be easy to walk into without lining up perfectly on a tiny spot
        this.tags.add('messageZone');

        this.message = message;
        this.triggered = false; // flips true the first time the player walks in - see update() below
    }

    update(dt, world) {
        if (this.triggered) return; // already fired once - this zone is permanently spent now

        const { player, events } = world;
        if (intersects(this.getAABB(), player.getAABB())) {
            this.triggered = true;
            events.emit('showMessage', { text: this.message, duration: 3000 });
        }
    }

    // Deliberately no render() here - these are invisible triggers, not
    // physical objects. PlayScene calls `entity.render?.(ctx, camera)` on
    // every entity, and the '?.' means simply not defining this method is
    // enough to make a MessageZone draw absolutely nothing.
}
