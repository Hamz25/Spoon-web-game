// src/engine/render/Renderer.js

/* This is where the class Renderer lives - it is called to render the whole game
   instead of duplicating raw canvas drawing calls in every file. It wraps a single
   CanvasRenderingContext2D ('ctx') that main.js already created, and exposes
   simple, reusable drawing methods on top of it. */

export class Renderer {

    constructor(ctx) {
        this.ctx = ctx; // Store the context that was passed in - Renderer does NOT fetch its own canvas/context
    }

/* 
    This function is responsible for handling the tile rendering 
    It only renders what the camera sees not the entire map
    Takes a Tileset (image + rectFor(tile)), not a raw image - see Tileset.js
*/
    renderTilemap(tilemap, tileset, camera) {
        const startCol = Math.floor(camera.x / tilemap.tileSize);
        const endCol = startCol + Math.ceil(camera.viewWidth / tilemap.tileSize) + 1;
        const startRow = Math.floor(camera.y / tilemap.tileSize);
        const endRow = startRow + Math.ceil(camera.viewHeight / tilemap.tileSize) + 1;

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const tile = tilemap.tileAt(col, row);
                if (tile === 0) continue;
                const screenX = col * tilemap.tileSize - camera.x;
                const screenY = row * tilemap.tileSize - camera.y;
                this.ctx.drawImage(tileset.image, ...tileset.rectFor(tile), screenX, screenY, tilemap.tileSize, tilemap.tileSize); // this.ctx now, same as clear()/drawRect() below - no reason for this method alone to take ctx as a param
                }
            }
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