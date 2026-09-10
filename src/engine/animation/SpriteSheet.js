// src/engine/animation/SpriteSheet.js

/* This is where the sprite loading will be it will move the sprite based on number of frames 
        
*/

export class SpriteSheet{

    /*  The frame data is stored in a JSON (Who is JSON ? (Its a meme))
        The JSON will return this structure : 
          { "frames": [{x,y,w,h}, ...], "clips": { "idle": {frames:[0], frameDuration:1}, ... } }
    */
    constructor(image, frameData){
        this.image = image;
        this.frames = frameData.frames;
        this.clips = frameData.clips; 
    }

    drawFrame(ctx, frameIndex, x, y, flipX = false) {
        const frame = this.frames[frameIndex]; // look up the crop rectangle for this specific frame

        ctx.save(); // save the canvas's current state so our flip transform doesn't affect anything drawn later

        if (flipX) {
            ctx.translate(x + frame.w, y); // move the origin to the right edge of where the sprite should end up
            ctx.scale(-1, 1);              // mirror everything drawn from here on, horizontally
            ctx.drawImage(this.image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h); // draw at (0,0) since the transform already repositioned the origin
        } else {
            ctx.drawImage(this.image, frame.x, frame.y, frame.w, frame.h, x, y, frame.w, frame.h); // normal draw, no flip
        }

        ctx.restore(); // undo the transform so future draws aren't mirrored/shifted
    }
}