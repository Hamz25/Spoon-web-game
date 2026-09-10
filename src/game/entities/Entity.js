/* This is the main Entity class 
   It is the base class for all entities in the game, including players, enemies, and other interactive objects.
   All of the entities in the game will inherit from this class and will have access to its properties and methods.
*/
import Vector2 from "../../engine/core/Vector2.js";

class Entity {
    constructor() { // The constructor will initialize the entity's details
        /* It is hard-coded for the default entity it will be over-written but the actual entities */
        this.position = new Vector2(0, 0); 
        this.velocity = new Vector2(0, 0);
        this.size = { width: 16, height: 16 };
        this.sprite = null; // The player skin 
        this.animator = null;
        this.collider = null;
        this.health = null;
        this.tags = new Set();
        this.alive = true;
    } 

    update(dt, world) {
         // The update function will be called every frame and will update the entity's position based on its velocity
    }
    getAABB() { // The getAABB function will return the entity's axis-aligned bounding box
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.size.width,
            height: this.size.height
        };
    }
}
export default Entity;