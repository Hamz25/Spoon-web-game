// game/config/constants.js
export const PHYSICS = {
  GRAVITY: 1400,          // px/s^2
  MAX_FALL_SPEED: 700,    // px/s (terminal velocity)
  MOVE_SPEED: 180,        // px/s, horizontal run speed
  SPRINT_SPEED: 1.3,     // this is going to be multiplied by the normal speed 
  ACCELERATION: 1200,     // px/s^2, ramp-up to MOVE_SPEED
  FRICTION: 1400,         // px/s^2, ramp-down when no input
  JUMP_VELOCITY: -480,    // px/s (negative = up, in screen coords)
  JUMP_CUT_MULTIPLIER: 0.4, // shrink upward velocity if jump released early
};