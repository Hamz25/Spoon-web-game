// src/engine/physics/AABB.js
/*
  Axis-Aligned Bounding Box (AABB) collision test.
  Every solid entity (player, enemy, tile, projectile) is approximated as an
  upright rectangle {x, y, width, height} for collision purposes.
  This is far cheaper than pixel-perfect collision and visually
  indistinguishable for a 2D platformer.
*/

// Returns true if rectangles 'a' and 'b' overlap at all, false otherwise.
// Both a and b must be shaped like { x, y, width, height } - same shape
// returned by Entity.getAABB().
export function intersects(a, b) {
    // Two rectangles overlap ONLY if they overlap on BOTH axes at once.
    // a's left edge must be left of b's right edge, AND
    // a's right edge must be right of b's left edge  -> X axis overlaps
    // (same logic repeated for Y, using top/bottom instead of left/right)
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

