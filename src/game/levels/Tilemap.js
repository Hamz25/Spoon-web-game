// src/game/levels/Tilemap.js
/*  This is the Tilemap class - it stores a level's grid of tile IDs as one
    FLAT array (not an array-of-arrays), which is faster and more cache-friendly.
    It also knows how to look up "what tile is at this grid position" and
    "what tile is at this exact pixel position in the world" - O(1) either way,
    since it's just array indexing, no searching involved.
*/

export default class Tilemap {
    constructor(width, height, tileSize, tiles, tileTypes) {
        this.width = width;       // how many columns the grid has
        this.height = height;     // how many rows the grid has
        this.tileSize = tileSize; // pixel size of ONE tile (tiles are always square here)
        this.tiles = tiles;       // the flat array of tile IDs, length = width * height
        this.tileTypes = tileTypes; // maps a tile ID (as a string key) -> behavior name, e.g. {"0":"empty","1":"ground"}
    }

    // Look up the tile ID sitting at a given column/row.
    // Returns 0 (empty) for anything outside the grid, instead of throwing -
    // this way collision code can safely ask about tiles near an edge without
    // needing its own bounds-checking every single time.
    tileAt(col, row) {
        if (col < 0 || row < 0 || col >= this.width || row >= this.height) return 0;
        return this.tiles[row * this.width + col];
    }

    // Same lookup, but takes real WORLD pixel coordinates instead of grid col/row.
    // Divides by tileSize and floors it to figure out which cell that pixel falls in.
    tileAtWorldPos(x, y) {
        return this.tileAt(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
    }

    // Is the tile at this col/row something solid (the player should collide with it)?
    // Reads the BEHAVIOR from tileTypes, rather than hardcoding "tile ID 1 = solid"
    // directly in the collision code - this way different tilesets/levels can reuse
    // the same engine code even if their tile IDs mean different things.
    isSolid(col, row) {
        return this.tileTypes[this.tileAt(col, row)] === 'ground';
    }
    isShape(col,row){
        return this.tileTypes[this.tileAt(col, row)] === 'shape';
    }

    // Is the tile at this col/row a hazard (should hurt the player on touch)?
    isHazard(col, row) {
        return this.tileTypes[this.tileAt(col, row)] === 'hazard';
    }
}