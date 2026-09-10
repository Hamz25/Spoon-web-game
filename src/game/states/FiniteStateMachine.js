// src/game/states/FiniteStateMachine.js
/*  This is a generic Finite State Machine (FSM).
    A state machine is just a map from state name -> behavior + transitions.
    This is used for BOTH game-level states (menu/playing/paused/gameover)
    and character-level states (idle/running/jumping/shooting/hurt/dead) -
    same class, reused in two different places.
*/

export default class FiniteStateMachine {
    constructor(initial) {
        this.states = new Map(); // name -> { onEnter, onUpdate, onExit } - each state can define any/none of these
        this.current = initial;  // the name of whichever state is currently active
    }

    // Register a new state under a name, with optional lifecycle hooks
    add(name, state) {
        this.states.set(name, state);
    }

    // Switch to a different state by name
    transition(name) {
        if (this.current === name) return; // already in this state - don't re-fire onExit/onEnter every frame it's called

        this.states.get(this.current)?.onExit?.();  // call the OLD state's onExit, if it has one
        this.current = name;                          // actually switch
        this.states.get(this.current)?.onEnter?.();  // call the NEW state's onEnter, if it has one
    }

    // Called every frame - runs whatever the CURRENT state's onUpdate does, if it has one
    update(dt) {
        this.states.get(this.current)?.onUpdate?.(dt);
    }
}