// src/engine/render/Tileset.js

/* This is where the class Tileset lives - it wraps a raw tilemap image the same
   way SpriteSheet wraps the player's sprite sheet. On its own, an image is just
   pixels; Tileset is what knows how tile ids map to rectangles inside that image,
   so Renderer can ask "give me the source rect for tile 4" instead of doing that
   math itself. */

export class Tileset {

    constructor(image, tileSize) {
        this.image = image; // the raw HTMLImageElement loaded via loadImage()
        this.tileSize = tileSize; // pixel width/height of a single tile - same value the tilemap itself uses
        this.columns = Math.floor(image.width / tileSize); // how many tiles fit across one row of the sheet - needed to turn a flat tile id into (col, row)
    }

    // Given a tile id, returns [sx, sy, sWidth, sHeight] - the source rectangle
    // to pass straight into ctx.drawImage(image, ...rectFor(tile), dx, dy, dw, dh)
    // NOTE: assumes tile ids start at 1 and 0 means "empty" (Renderer already skips 0 tiles)
    rectFor(tileId) {
        const index = tileId - 1;
        const col = index % this.columns;
        const row = Math.floor(index / this.columns);
        return [col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize];
    }
}