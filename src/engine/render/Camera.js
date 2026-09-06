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

    // target = the entity the camera tracks (the player)
    // levelBounds = { width, height } of the whole level, so the camera doesn't show past the edges
    // smoothing = how quickly the camera eases toward the target (0 = never moves, 1 = snaps instantly)
    follow(target, levelBounds, smoothing = 0.1) {
        // Center the target in the viewport
        const desiredX = target.position.x - this.viewWidth / 2;
        const desiredY = target.position.y - this.viewHeight / 2;

        // Ease the camera toward the desired position instead of snapping instantly (a lerp) just like you a larper who doesn't know how to code but takes this source code and run it and call yourself a programmer 
        
        this.x += (desiredX - this.x) * smoothing;
        this.y += (desiredY - this.y) * smoothing;

        // Clamp so the camera never shows outside the level bounds
        this.x = clamp(this.x, 0, Math.max(0, levelBounds.width - this.viewWidth));
        this.y = clamp(this.y, 0, Math.max(0, levelBounds.height - this.viewHeight));
    }
}