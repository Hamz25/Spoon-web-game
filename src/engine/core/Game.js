/*
  The Game class is the top-level orchestrator: it owns the canvas, every
  core system (renderer, camera, input), the Loop that drives it all, and
  now - the active Scene. This used to also own the player and the level
  directly, which meant Game couldn't exist without gameplay already
  running. Pulling that out into PlayScene means Game only has to know
  "there is a current scene, tell it to update and render" - it doesn't
  care whether that's a menu, gameplay, or a game-over screen.
*/
import { Loop } from './Loop.js';
import { eventBus } from './EventBus.js';
import { InputManager } from '../input/InputManager.js';
import { Renderer } from '../render/Renderer.js';
import { Camera } from '../render/Camera.js';
import { MenuScene } from '../../game/scenes/MenuScene.js';
import { AudioManager } from '../audio/AudioManager.js'
import { AudioControls } from '../../game/ui/AudioControls.js'

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.worldColor = '#8ab3ff'; // sky blue - drawn behind everything each frame, even the menu

        this.events = eventBus; // exposed on the instance too, so anything holding a `game`
                                 // reference (a Scene, an entity) can reach the shared bus
                                 // without a separate import

        this.renderer = new Renderer(this.ctx);
        this.input = new InputManager();
        this.camera = new Camera(canvas.width, canvas.height);
        this.audio = new AudioManager();

        // NEW - the mute/volume control. Built right here, next to `audio`,
        // and never touched again by Game itself: same reasoning as
        // `this.audio` - it needs to exist for the app's whole lifetime,
        // independent of whichever Scene happens to be active, so it's not
        // something any individual Scene should own or clean up.
        this.audioControls = new AudioControls(this.audio);

        // No player, no level, no tileset here anymore - those only make
        // sense while PlayScene is active, so PlayScene owns them now.
        // Game just needs to know which scene is currently in charge.
        this.currentScene = null;

        // Bind once here rather than passing arrow functions to `new Loop(...)` in start() -
        // keeps update/render as stable references, which matters if anything ever wants to
        // unsubscribe/re-subscribe the loop's callbacks later.
        this.loop = new Loop(this.update.bind(this), this.render.bind(this));
    }

    // The one place scene transitions happen. Deliberately awaits the
    // incoming scene's enter() BEFORE reassigning `currentScene` - not
    // after. An earlier version assigned currentScene first and awaited
    // enter() second, which left a window where the Loop kept ticking
    // against a scene whose enter() hadn't finished yet (PlayScene
    // mid-fetch, `this.level` still undefined) - the instant a frame
    // slipped through that gap, update() crashed reading .tilemap off
    // undefined. Loading against a scene the loop can't see yet means
    // that's now impossible: the OLD scene keeps ticking and rendering
    // for the entire duration of the load, and the swap only happens
    // once the new scene is fully ready to be updated/rendered.
    async changeScene(newScene) {
        const previousScene = this.currentScene;
        await newScene.enter();
        if (previousScene) previousScene.exit();
        this.currentScene = newScene;
    }

    // Used to load the sprite and level directly and land you in gameplay.
    // Now it just puts you on the menu - actual loading is deferred until
    // the player asks for it (clicks Play), which is why this resolves
    // almost instantly instead of blocking on a fetch.
    async init() {
        await this.changeScene(new MenuScene(this));
    }

    // Actually starts the frame loop. Kept separate from init() so callers must
    // explicitly await setup before the game starts running - see main.js.
    start() {
        this.loop.start();
    }

    // Runs every frame, before render(). Delegates straight to whatever
    // scene is active - the `?.` covers the brief instant before the very
    // first changeScene() call resolves and currentScene is still null.
    update(dt) {
        this.currentScene?.update(dt);
    }

    // Runs every frame, after update() - only draws, never changes game state.
    // The clear happens here, once, so no individual scene has to remember
    // to paint over the previous frame before drawing its own content.
    render() {
        this.renderer.clear(this.worldColor);
        this.currentScene?.render(this.ctx);
    }
}