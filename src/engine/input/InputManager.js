// src/engine/input/InputManager.js
// THis class will handle any input from the user and based on that input will update the game state

export class InputManager {
    constructor() { // The constructor will initialize the input manager and set up event listeners for key presses
        this.keys = new Set();

        // Action name -> physical key codes that trigger it. This used to live
        // as a local `map` object typed out fresh inside isKeyPressed() every
        // time it ran - pulled it out to a shared field instead so the new
        // isKeyJustPressed() below (added for the birthday level's "press E to
        // open the chest" / "press E to pet the cat" moments) can reuse the
        // EXACT same mapping instead of keeping a second copy in sync by hand.
        this.actionMap = {
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            jump: ['Space', 'KeyW', 'ArrowUp'],
            crouch: ['ArrowDown', 'KeyS'],
            sprint: ['ShiftLeft', 'ShiftRight'],
            interact: ['KeyE', 'Enter'], // NEW - opening chests / petting the cat both go through this one action, see Chest.js and Cat.js
            fireworks: ['KeyF'], // NEW - sets off a collected firework (see Firework.js / PlayScene's onChestOpened + update()). Checked with isKeyJustPressed, same as 'interact', so holding F down doesn't launch a new rocket every single frame.
        };

        // justPressed holds codes that were pressed but haven't been "read"
        // yet by anything - see isKeyJustPressed(). It gets emptied the
        // INSTANT something checks it (consume-on-read), not once per frame,
        // so this doesn't need any help from Loop.js/Game.js at all - no
        // extra "end of frame" step to remember to call anywhere.
        this.justPressed = new Set();

        window.addEventListener('keydown', e => {
            if (!this.keys.has(e.code)) {
                // Only the FIRST keydown for a key counts as "just pressed".
                // Holding a key down makes the browser fire keydown over and
                // over on its own (key repeat) - without this guard, every one
                // of those repeats would also look like a brand new press,
                // which would make isKeyJustPressed() fire constantly instead
                // of just once per actual press of the key.
                this.justPressed.add(e.code);
            }
            this.keys.add(e.code);
        });
        window.addEventListener('keyup', e => {
            this.keys.delete(e.code);
            this.justPressed.delete(e.code); // released before anyone even checked it - nothing left worth reporting
        });
    }
    // this is a function that will check the input value of the key and return true if the key is pressed and false if it is not pressed
    isKeyPressed(keyCode) {
        return this.actionMap[keyCode].some(code => this.keys.has(code));
    }

    // Same idea as isKeyPressed, but only true ONCE per physical press of the
    // key, instead of true for every frame the key happens to still be held
    // down. Needed for stuff like opening a chest - with plain isKeyPressed,
    // holding the interact key down would try to "open" the chest again on
    // every single frame instead of just the one time you meant to press it.
    isKeyJustPressed(keyCode) {
        return this.actionMap[keyCode].some(code => {
            if (this.justPressed.has(code)) {
                this.justPressed.delete(code); // consume it - reading it once IS the point, so it shouldn't still say "just pressed" on the next check
                return true;
            }
            return false;
        });
    }
}