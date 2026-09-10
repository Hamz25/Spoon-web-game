// src/game/states/playerStates.js
/*  This file defines the actual STATES that get registered into the player's
    FiniteStateMachine. The FSM itself (FiniteStateMachine.js) is generic and
    knows nothing about "jumping" or "hurt" - this file is where that meaning
    actually lives.

    The whole point of doing it this way: the STATE decides which animation
    clip plays, via onEnter. Nothing else in the codebase should be manually
    deciding "which sprite to draw" - it all flows through here.
*/

export function definePlayerStates(player) {

    player.stateMachine.add('idle', {
        onEnter: () => player.animator?.play('idle'), // '?.' guards against animator still being null during early startup
    });

    player.stateMachine.add('running', {
        onEnter: () => player.animator?.play('run'),
    });

    player.stateMachine.add('jumping', {
        onEnter: () => player.animator?.play('jump'),
        onUpdate: () => {
            // Once the player starts falling (moving downward), switch to the falling state.
            // This is checked every frame WHILE jumping is the active state.
            if (player.velocity.y > 0) {
                player.stateMachine.transition('falling');
            }
        },
    });

    player.stateMachine.add('falling', {
        // Sharing the jump clip is intentional - most small sprite sheets don't have
        // a separate "falling" frame, so re-using 'jump' is a normal, common shortcut.
        onEnter: () => player.animator?.play('jump'),
        onUpdate: () => {
            // Once the player lands, go back to idle or running depending on movement.
            if (player.grounded) {
                player.stateMachine.transition(player.velocity.x !== 0 ? 'running' : 'idle');
            }
        },
    });

    player.stateMachine.add('shooting', {
        onEnter: () => {
            player.animator?.play('shoot');
            player.hasFiredThisAnimation = false; // reset the "did we already spawn a bullet this animation" flag
        },
        onExit: () => {
            player.hasFiredThisAnimation = false; // also reset on exit, so the NEXT time we enter shooting, it starts clean
        },
    });

    player.stateMachine.add('hurt', {
        onEnter: () => {
            player.animator?.play('hurt');
            player.invulnerableTimer = 1.0; // i-frames start the moment we enter the hurt state - matches 07-shooting-and-combat.md
        },
    });

    player.stateMachine.add('dead', {
        onEnter: () => {
            player.animator?.play('hurt'); // no dedicated "dead" clip in most small sprite sheets - reuse hurt, per the docs' own clipForState mapping
            player.alive = false; // the player entity is now considered dead - CollisionSystem's `alive` check will skip it from now on
        },
    });
    
    player.stateMachine.add('crouching', {
    onEnter: () => player.animator?.play('idle'), // no dedicated crouch clip in a 2-frame sheet - reusing idle for now, swap in a real 'crouch' clip once you have one
    });
}