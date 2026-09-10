// src/engine/physics/CollisionSystem.js
/*  This is where the collision logic lives
    it is a function that will check every entity against every other entity ONCE
    (not infinitely - just every unique pair, one time per call)
*/
import { intersects } from "./AABB.js";

export function checkEntityCollisions(entities) {

    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) { // start j right after i so we never repeat a pair or compare an entity to itself

            const a = entities[i];
            const b = entities[j];

            if (!a.alive || !b.alive) continue; // skip dead/inactive entities - no point checking collisions on something that's already gone

            if (intersects(a.getAABB(), b.getAABB())) {
                console.log("Two entities collided:", a, b); // generic for now - real damage/stomp/hit logic comes later once the FiniteStateMachine exists
            }
        }
    }
}