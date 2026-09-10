// src/game/levels/LevelLoader.js
/*  
    This is where a level JSON file gets turned into an actual playable level:
    a Tilemap instance (the grid) + a list of real entity instances (enemies,
    pickups, etc.) spawned at the positions the JSON specifies.

    'factories' is a lookup object like { enemy_grump: (e) => new Enemy(e.x, e.y) } -
    this keeps LevelLoader from needing to import/know about every entity type
    directly. It just calls whatever factory function matches each entity's "type".

    UPDATED: factories are now called with the FULL entity object from the JSON
    (not just x, y). Some level files (like the birthday level) put extra
    per-entity data on the entity itself - e.g. a messageZone's own unique
    "message" text - and factories need access to that, not just position.
    Every factory just needs to pull whatever fields it cares about off the
    object it's given.
*/

import Tilemap from "./Tilemap.js";

export async function loadLevel(path, factories = {}) {
    const data = await fetch(path).then(r => r.json()); // fetch + parse the level JSON, same pattern as loading the sprite JSON in main.js

    const tilemap = new Tilemap(
        data.width,
        data.height,
        data.tileSize,
        data.tiles,
        data.tileTypes
    );

    // Walk the JSON's 'entities' spawn list and build a REAL entity for each one,
    // using whichever factory function matches its "type" string. The factory
    // gets the whole entity object (x, y, and anything else the JSON put on it),
    // so it can pull out extra per-entity data itself.
    const entities = (data.entities || []).map(e => {
        const factory = factories[e.type];
        if (!factory) {
            throw new Error(
                `LevelLoader: no entity factory registered for type "${e.type}" ` +
                `(found in ${path}). Add a "${e.type}" key to this scene's entityFactories.`
            );
        }
        return factory(e);
    });

    return {
        tilemap,                 // the grid, ready for collision/rendering
        entities,                // actual spawned entity instances
        playerStart: data.playerStart, // {x, y} - where main.js should place the player
        bounds: data.bounds      // {width, height} - the level's total size, for Camera + wall-clamping
    };
}