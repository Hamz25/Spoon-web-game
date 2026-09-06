// src/engine/render/Renderer.js

/* This is where the class Renderer lives - it is called to render the whole game
   instead of duplicating raw canvas drawing calls in every file. It wraps a single
   CanvasRenderingContext2D ('ctx') that main.js already created, and exposes
   simple, reusable drawing methods on top of it. */

export class Renderer {

    constructor(ctx) {
        this.ctx = ctx; // Store the context that was passed in - Renderer does NOT fetch its own canvas/context
    }

    clear(color) {
        this.ctx.fillStyle = color; // Set the fill color first...
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); // ...then paint the ENTIRE canvas with it (ctx.canvas points back to the <canvas> element)
    }

    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color; // fillRect has no color argument of its own - color must be set on the context first
        this.ctx.fillRect(x, y, width, height); // Draw the actual rectangle at the given position/size
    }
}