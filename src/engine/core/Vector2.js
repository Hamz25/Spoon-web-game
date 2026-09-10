/*
This is the 2D Vector class I will use it to represent positions and velocities in 2D space
It works by storing two values, x and y, which represent the horizontal and vertical components of the vector.
and it provides methods for performing common vector operations such as addition, scaling, and linear interpolation.
*/

class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
  scale(s) { return new Vector2(this.x * s, this.y * s); }
  static lerp(a, b, t) {
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}

export default Vector2;