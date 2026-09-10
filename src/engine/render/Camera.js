// src/engine/render/Camera.js
/* This is the Camera class - it follows the player and determines what
   portion of the world is visible on screen (the "viewport"). */

import { clamp } from "../../utils/math.js"; // clamp(value, min, max) keeps a number within a range

export class Camera {
    constructor(viewWidth, viewHeight) {
        this.x = 0; // Camera's current top-left position in world space
        this.y = 0;
        this.viewWidth = viewWidth; // Store the viewport size on the instance so follow() can use it
        this.viewHeight = viewHeight;
    }

    // Works out where the camera WANTS to be to keep `target` centered, clamped
    // so it never shows past the level's edges. Shared by follow() and snapTo()
    // so the centering/clamping math only lives in one place.
    #desiredPosition(target, levelBounds) {
        const desiredX = target.position.x - this.viewWidth / 2;
        const desiredY = target.position.y - this.viewHeight / 2;

        return {
            x: clamp(desiredX, 0, Math.max(0, levelBounds.width - this.viewWidth)),
            y: clamp(desiredY, 0, Math.max(0, levelBounds.height - this.viewHeight)),
        };
    }

    // target = the entity the camera tracks (the player)
    // levelBounds = { width, height } of the whole level, so the camera doesn't show past the edges
    // smoothing = how quickly the camera eases toward the target per frame (0 = never moves, 1 = snaps instantly)
    follow(target, levelBounds, smoothing = 0.04) {
        const desired = this.#desiredPosition(target, levelBounds);

        // Ease toward the desired position each frame instead of snapping straight to it -
        // this is what makes the camera feel like it's smoothly "catching up" to the player
        // rather than rigidly locking to their exact position every frame.
        this.x += (desired.x - this.x) * smoothing;
        this.y += (desired.y - this.y) * smoothing;
    }

    // Moves the camera DIRECTLY to where it should be, with no easing at all - for
    // moments where the smooth chase would look wrong, like the player respawning
    // after falling out of the world. Without this, the camera would slowly drift
    // back across the level toward the respawn point instead of cutting there instantly.
    snapTo(target, levelBounds) {
        const desired = this.#desiredPosition(target, levelBounds);
        this.x = desired.x;
        this.y = desired.y;
    }
}