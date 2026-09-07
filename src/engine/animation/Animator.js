// src/engine/animation/Animator.js
/* 
    This is the Animator class it is responsible for updating the sprite sheet and animate it.
*/

import { SpriteSheet } from './SpriteSheet.js'

export class Animator {
    constructor(spriteSheet) { // an ALREADY-BUILT SpriteSheet instance is passed in - Animator never constructs its own
        this.sheet = spriteSheet;
        this.currentClip = null; // name of the currently playing clip
        this.frameIndex = 0;     // which frame WITHIN that clip is showing right now (an index into clip.frames, not the sheet's raw frame list)
        this.elapsed = 0;        // how much time has passed since the current frame started showing
    }

    play(clipName) {
        if (this.currentClip === clipName) return; // already playing this clip - don't restart it

        if (!this.sheet.clips[clipName]) { // guard: does this clip actually exist in the loaded JSON?
            console.warn(`Animator: no clip named "${clipName}" found - ignoring play() call`);
            return; // stay on whatever clip was already playing, instead of crashing later in update()
        }

        this.currentClip = clipName;
        this.frameIndex = 0;
        this.elapsed = 0;
    }

    update(dt) {
        const clip = this.sheet.clips[this.currentClip]; // look up the currently playing clip's data (its frame list + timing)
        this.elapsed += dt;

        if (this.elapsed >= clip.frameDuration) { // enough time has passed to advance to the next frame
            this.elapsed = 0;
            this.frameIndex++;

            if (this.frameIndex >= clip.frames.length) { // ran past the last frame in this clip
                this.frameIndex = clip.loop ? 0 : clip.frames.length - 1; // loop back to the start, or freeze on the last frame if it's a one-shot animation
            }
        }
    }

    draw(ctx, x, y, flipX) {
        const clip = this.sheet.clips[this.currentClip];
        const actualFrame = clip.frames[this.frameIndex]; // clip.frames is like [1, 2] - frameIndex points INTO this array, not directly to the sheet's frame index
        this.sheet.drawFrame(ctx, actualFrame, x, y, flipX); // let SpriteSheet handle the actual pixel drawing
    }
}