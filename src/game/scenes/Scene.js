// src/game/scenes/Scene.js
/*
  Scene is the contract every screen in the game agrees to. Game never asks
  "is this the menu or gameplay or game-over" - it just calls enter/exit/
  update/render on whatever `currentScene` happens to be. That's the whole
  point of this class: it lets Game stay dumb about what's actually running,
  the same way EventBus lets systems talk without knowing about each other.
*/
export class Scene {
    constructor(game) {
        // Every scene gets a handle back to the shared Game instance, since
        // that's where the systems that don't belong to any one scene live -
        // renderer, input, camera, event bus. Without this, PlayScene would
        // have no way to reach game.camera.follow() or game.input.
        this.game = game;
    }

    // Called exactly once, right after Game swaps this scene in. Marked
    // async (even though the base implementation doesn't need it) because
    // real scenes - PlayScene especially - use this as their loading hook:
    // Game.changeScene() awaits it, so nothing tries to update/render a
    // scene whose assets haven't arrived yet.
    async enter() {}

    // Called exactly once, right before Game swaps this scene out. NOT
    // async on purpose - by the time a scene is being replaced, there's
    // nothing worth waiting on, just cleanup (DOM nodes, event listeners)
    // that needs to happen synchronously so it can't outlive the scene.
    exit() {}

    update(dt) {}
    render(ctx) {}
}