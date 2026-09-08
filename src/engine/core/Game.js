// src/engine/core/Game.js
/*
  The Game class is the top-level orchestrator: it owns the canvas, every
  core system (renderer, camera, input), the currently loaded level, and the
  Loop that drives it all. This used to live directly in main.js - pulling it
  in here means main.js's only job becomes "create a Game and start it",
  and the actual game logic is a reusable class instead of loose top-level
  code.
*/
import { Loop } from './Loop.js';
import { eventBus } from './EventBus.js';
import Vector2 from './Vector2.js';
import { InputManager } from '../input/InputManager.js';
import { Renderer } from '../render/Renderer.js';
import { Camera } from '../render/Camera.js';
import { Tileset } from '../render/Tileset.js';
import { SpriteSheet } from '../animation/SpriteSheet.js';
import { Animator } from '../animation/Animator.js';
import { loadImage } from '../assets/AssetLoader.js';
import { loadLevel } from '../../game/levels/LevelLoader.js';
import Player from '../../game/entities/Player.js';

// The player sprite frame (24x24) is bigger than its collision box (16x16).
// Centering it horizontally and bottom-aligning it means the ART lines up
// with where the HITBOX actually stands on the ground, instead of hanging
// 8px too low and appearing to sink into the floor. See Player.size for the
// hitbox dimensions these are measured against.
const SPRITE_FRAME_SIZE = { width: 24, height: 24 };

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.worldColor = '#8ab3ff'; // sky blue - drawn behind everything each frame

        this.events = eventBus; // exposed on the instance too, so anything holding a `game`
                                 // reference (a Scene, later on) can reach the shared bus
                                 // without a separate import

        this.renderer = new Renderer(this.ctx);
        this.input = new InputManager();
        this.camera = new Camera(canvas.width, canvas.height);
        this.player = new Player();

        // Respawning teleports the player, but camera.follow()'s easing would otherwise
        // slowly drift the view back across the level toward the respawn point instead
        // of cutting there instantly - snapTo bypasses that easing for this one case.
        // This fires synchronously inside player.update() (before camera.follow() runs
        // later in the same frame), so by the time follow() runs the camera is already
        // exactly where it should be and the easing has nothing left to do.
        this.events.on('playerDied', () => this.camera.snapTo(this.player, this.level.bounds));

        this.level = null;   // filled in by init() once level-1.json finishes loading
        this.tileset = null; // filled in by init() once the tileset image finishes loading

        // Bind once here rather than passing arrow functions to `new Loop(...)` in start() -
        // keeps update/render as stable references, which matters if anything ever wants to
        // unsubscribe/re-subscribe the loop's callbacks later.
        this.loop = new Loop(this.update.bind(this), this.render.bind(this));
    }

    // Loads everything the game needs before the loop can safely run. Both the
    // sprite and the level load asynchronously, so nothing in update()/render()
    // is allowed to run until this fully resolves - that's why start() is a
    // separate step from init(), rather than kicking off the Loop in here.
    async init() {
        const image = await loadImage('/assets/sprites/player-sprite.png');
        const frameData = await fetch('/assets/sprites/player-sprite.json').then(r => r.json());
        const sheet = new SpriteSheet(image, frameData);
        this.player.animator = new Animator(sheet);
        this.player.animator.play('idle');

        const tilemapImage = await loadImage('/assets/tiles/tileset.png');
        this.level = await loadLevel('/assets/levels/level-1.json', {}); // {} = no entity factories yet

        this.tileset = new Tileset(tilemapImage, this.level.tilemap.tileSize);

        this.player.position = new Vector2(this.level.playerStart.x, this.level.playerStart.y);

        // The current respawn point. There's no real checkpoint system yet, so this
        // just starts (and stays) at the level's playerStart - but Player.js reads
        // this through `world.respawnPoint` rather than reaching for level.playerStart
        // directly, so later a Checkpoint entity can simply do
        // `game.checkpoint = new Vector2(x, y)` (e.g. via an eventBus 'checkpointReached'
        // listener) and nothing in Player.js has to change.
        this.checkpoint = new Vector2(this.level.playerStart.x, this.level.playerStart.y);

        // Lets anything listening know setup is done - a menu scene waiting to show
        // "Press Start", an analytics hook, AudioManager unlocking its context, etc.
        // Nothing currently subscribes to this, but it costs nothing to emit and
        // saves a refactor later.
        this.events.emit('gameReady');
    }

    // Actually starts the frame loop. Kept separate from init() so callers must
    // explicitly await setup before the game starts running - see main.js.
    start() {
        this.loop.start();
    }

    // Runs every frame, before render() - advances the simulation by dt seconds.
    update(dt) {
        this.player.update(dt, {
            tilemap: this.level.tilemap,
            bounds: this.level.bounds,
            respawnPoint: this.checkpoint,
        }, this.input);
        this.camera.follow(this.player, this.level.bounds);
    }

    // Runs every frame, after update() - only draws, never changes game state.
    render() {
        this.renderer.clear(this.worldColor);
        this.renderer.renderTilemap(this.level.tilemap, this.tileset, this.camera);

        const offsetX = (SPRITE_FRAME_SIZE.width - this.player.size.width) / 2;
        const offsetY = SPRITE_FRAME_SIZE.height - this.player.size.height;

        const screenX = Math.round(this.player.position.x - this.camera.x - offsetX);
        const screenY = Math.round(this.player.position.y - this.camera.y - offsetY);

        this.player.animator.draw(this.ctx, screenX, screenY, this.player.facing === 'right');
    }
}