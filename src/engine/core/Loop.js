// src/engine/core/Loop.js
// This is the main game loop, which will call the update and render functions at a fixed timestep
// It will also calculate the delta time (dt) between frames, which is passed to the update function

export class Loop {

    constructor(update, render) {
        this.lastTime = 0; // The last time the loop was called
        this.running = false; // Whether the loop is currently running
        this.update = update; // The update function to call each frame
        this.render = render; // The render function to call each frame
        }
        start() {
            this.running = true; // Set the loop to running
            requestAnimationFrame(this._tick.bind(this)); /* Start the loop and bind the _tick method to the current instance so that
                                                            'this' refers to the Loop instance inside _tick                        */ 
        }
        _tick(currentTime) {
            if (!this.running) return; // If the loop is not running, exit
            const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Calculate the delta time in seconds and make it to the minimum because the browser has delays 
            this.lastTime = currentTime; // Update the last time to the current time
            this.update(dt); // Call the update function with the delta time
            this.render(); // Call the render function
            requestAnimationFrame(this._tick.bind(this)); // Request the next frame same with the binding as above 
        }
}