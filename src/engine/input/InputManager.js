// THis class will handle any input from the user and based on that input will update the game state

export class InputManager {
    constructor() { // The constructor will initialize the input manager and set up event listeners for key presses
        this.keys = new Set();
        window.addEventListener('keydown', e => this.keys.add(e.code));
        window.addEventListener('keyup', e => this.keys.delete(e.code));
    }
    // this is a function that will check the input value of the key and return true if the key is pressed and false if it is not pressed
    isKeyPressed(keyCode) {
        const map = {
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            jump: ['Space', 'KeyW', 'ArrowUp'],
            crouch: ['ArrowDown', 'KeyS'],
            sprint: ['ShiftLeft', 'ShiftRight'],
        };
        return map[keyCode].some(code => this.keys.has(code));
    }
}