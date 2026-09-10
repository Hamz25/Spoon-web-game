// src/game/scenes/PlayScene.js
/*
  Everything that used to live directly on Game - the player, the level,
  the tileset, the camera-follow logic - now lives here instead. Moving it
  out of Game wasn't just tidiness: Game used to assume gameplay was always
  running from the moment init() finished, which made a menu screen
  impossible without either faking a player/level or special-casing around
  them. PlayScene owning all of this means Game can go back to knowing
  nothing about what "playing" even involves.

  UPDATED for the birthday level: this used to hardcode its own level/sprite/
  tileset paths and never touched `level.entities` at all (LevelLoader has
  always spawned them, this scene just... never updated or drew them - the
  chests/cat/message-zones needed for the surprise level would have loaded
  in and then sat there doing nothing). Two changes below:
    1) The asset paths are now `options` with defaults matching the
       ORIGINAL hardcoded values, so plain `new PlayScene(game)` (still
       exactly what MenuScene's normal Play button does) behaves identically
       to before. BirthdayScene.js is the only thing that passes different
       options in.
    2) update()/render() now actually loop over `level.entities` and call
       their own update()/render() - see the new blocks below. This was
       "dead" functionality before (LevelLoader built the entities, nothing
       ever touched them again), not a behavior change to anything that was
       previously working.

  UPDATED AGAIN: music moved here from MenuScene. MenuScene used to load
  and play one shared theme before either button was even clicked, which
  meant PlayScene and BirthdayScene were stuck with the same song whether
  they wanted it or not. Now each PlayScene (and by extension each
  BirthdayScene, since it just passes different options) loads and plays
  ITS OWN theme in enter(), same options-with-defaults trick as levelPath
  etc. above, and stops it again in exit() so it doesn't keep looping once
  the player's back at the menu or into a different scene.

  UPDATED AGAIN: the firework collectible. A chest can now optionally grant
  an item when opened (see Chest.js's `grantsItem`); this scene is what
  turns that into something real - it tracks how many she's holding in
  `this.inventory`, lazily loads the rocket's art only if the current level
  actually has a chest that grants one, and spawns a Firework entity
  straight into level.entities whenever she presses the new 'fireworks' key
  with at least one in stock. Kept entirely in PlayScene rather than
  Player.js - it already owns level.entities and already reads
  this.player.position/size/facing directly elsewhere in this file, so
  nothing about Player.js needed to change for this.
*/
import { Scene } from './Scene.js';
import Vector2 from '../../engine/core/Vector2.js';
import { Tileset } from '../../engine/render/Tileset.js';
import { SpriteSheet } from '../../engine/animation/SpriteSheet.js';
import { Animator } from '../../engine/animation/Animator.js';
import { loadImage } from '../../engine/assets/AssetLoader.js';
import { loadLevel } from '../levels/LevelLoader.js';
import Player from '../entities/Player.js';
import Firework from '../entities/Firework.js';
import { MessageBox } from '../ui/MessageBox.js';

export class PlayScene extends Scene {
    constructor(game, options = {}) {
        super(game);

        // Lets a caller (BirthdayScene) point this whole scene at a
        // different level file / entity set without copy-pasting the
        // loading, update, and render logic that follows - it's ALL still
        // just "a PlayScene", only the content it loads changes. Every
        // default below matches what used to be hardcoded directly in
        // enter(), so nothing about the normal level changes.
        this.levelPath = options.levelPath ?? '/assets/levels/level-1.json';
        this.spriteImagePath = options.spriteImagePath ?? '/assets/sprites/player2-sprite.png';
        // NOTE: this MUST always point at the JSON that was authored for
        // whichever image is above. It used to point at 'player-sprite.json'
        // while the image was 'player2-sprite.png' - two different sheets
        // with two different frame layouts - which is why frames were
        // rendering cut up/misaligned. Keep the base filenames matching
        // (foo-sprite.png <-> foo-sprite.json) for every character you add.
        this.spriteDataPath = options.spriteDataPath ?? '/assets/sprites/player2-sprite.json';
        this.tilesetImagePath = options.tilesetImagePath ?? '/assets/tiles/tilemap_packed.png';
        this.entityFactories = options.entityFactories ?? {}; // type string -> (x, y) => Entity, handed straight to loadLevel()

        // NEW - same idea as spriteImagePath/spriteDataPath above, but for the
        // cat companion. Only actually LOADED below if the level turns out to
        // contain a cat (see enter()) - level-1 has no cat entity, so plain
        // `new PlayScene(game)` never pays for this fetch. Defaults point at
        // the same place BirthdayScene's cat-sprite.png/json live, so nothing
        // needs to change there unless she wants a different cat image later.
        this.catSpriteImagePath = options.catSpriteImagePath ?? '/assets/sprites/cat-sprite.png';
        this.catSpriteDataPath = options.catSpriteDataPath ?? '/assets/sprites/cat-sprite.json';

        // NEW - the birthday cake's art (see Cake.js and the new cakeEntities
        // block in enter()). Only 4 raw frames, no animation JSON needed -
        // Cake.js slices frame N out of this image manually rather than
        // going through SpriteSheet/Animator, since the frame layout is
        // fixed (4 equal-width frames in a row) and doesn't need the
        // general-purpose named-clips machinery those two classes provide.
        this.cakeSpriteImagePath = options.cakeSpriteImagePath ?? '/assets/sprites/cake-sprite.png';

        // NEW - the firework rocket's art. riseImage is a plain static
        // picture (no JSON - it isn't animated while climbing), the explode
        // pair is a real spritesheet for the burst. Same "only pay for it if
        // the level needs it" gating as the cat sprite above - see enter().
        this.fireworkRiseImagePath = options.fireworkRiseImagePath ?? '/assets/sprites/firework-rise.png';
        this.fireworkExplodeImagePath = options.fireworkExplodeImagePath ?? '/assets/sprites/firework-explode.png';
        this.fireworkExplodeDataPath = options.fireworkExplodeDataPath ?? '/assets/sprites/firework-explode.json';

        // NEW - each PlayScene now owns its own music. `themeName` is the
        // key it gets stored/played under in AudioManager's buffer map;
        // `themePath` is what actually gets fetched. Defaulting themeName to
        // the FILE path itself (rather than something like 'theme') is
        // deliberate: it means level-1 and the birthday level can never
        // collide on the same buffer name just because BirthdayScene forgot
        // to override it, since AudioManager.load()/buffers is a flat
        // Map keyed only by name, with no per-scene isolation of its own.
        this.themePath = options.themePath ?? '/assets/audio/theme.mp3';
        this.themeName = options.themeName ?? this.themePath;

        // NEW - what she's currently holding. Lives on the scene (not the
        // player) for the same reason checkpoint/messageBox do - it only
        // makes sense while a level is actually being played, and this way
        // Player.js doesn't need to know inventory exists at all.
        // NOTE: key here MUST match the actual grantsItem string Chest
        // instances use (see Chest.js's grantsItem / BirthdayScene's
        // chest_2 / world-builder's GRANTABLE_ITEMS), which is the
        // SINGULAR 'firework' - onChestOpened below writes to
        // this.inventory[grantsItem] dynamically, so a plural key here
        // would silently create a second, never-incremented property
        // instead of actually tracking what chests hand out.
        this.inventory = { firework: 0 };

        // NEW - queued fireworks waiting to launch from a triggered Cake
        // (see onCakeTriggered below). A cake's whole batch doesn't spawn
        // in the same instant - each entry sits here counting down its own
        // `remaining` seconds and gets pushed into level.entities the
        // moment that hits zero, so "a bunch of fireworks" actually reads
        // as one-after-another instead of a single simultaneous stack. Kept
        // as a flat array (not per-cake) since nothing here needs to know
        // WHICH cake a given queued launch came from once it's queued.
        this.pendingFireworks = [];
    }

    // This is where all the loading that used to happen in Game.init()
    // moves to - which is exactly why MenuScene's Play button can await
    // changeScene() and show "Loading..." while this runs. Nothing in
    // update()/render() below is safe to call until this fully resolves.
    async enter() {
        const { game } = this;

        this.player = new Player();

        const image = await loadImage(this.spriteImagePath);
        const frameData = await fetch(this.spriteDataPath).then(r => r.json());
        const sheet = new SpriteSheet(image, frameData);
        this.player.animator = new Animator(sheet);
        this.player.animator.play('idle');

        const tilemapImage = await loadImage(this.tilesetImagePath);
        this.level = await loadLevel(this.levelPath, this.entityFactories);
        this.tileset = new Tileset(tilemapImage, this.level.tilemap.tileSize);

        // NEW - wire up a sprite for the cat, the same way the player gets
        // one above. This used to not happen AT ALL: LevelLoader spawned Cat
        // instances, but nothing ever gave them an animator, so Cat.render()
        // fell back to a plain colored rectangle forever. Tag-based (not
        // "instanceof Cat") and gated on the level actually having one, so
        // normal level-1 (no cat) never fetches this image/json at all, and
        // adding a second companion type later doesn't mean editing this
        // file again for every new entity - just tagging it 'cat' would work,
        // though a truly generic version of this would key off entity type
        // rather than a hardcoded tag if a THIRD sprite-having entity shows up.
        // NEW - give every chest the tileset PlayScene already loaded for the
        // level's tiles. Chest.js's default closed/open tile ids point into
        // this SAME sheet, so no separate image or fetch is needed here -
        // just a reference hand-off, same pattern as cat.animator below.
        const chestEntities = this.level.entities.filter(entity => entity.tags?.has('chest'));
        for (const chest of chestEntities) {
            chest.tileset = this.tileset;
        }

        const catEntities = this.level.entities.filter(entity => entity.tags?.has('cat'));
        if (catEntities.length > 0) {
            const catImage = await loadImage(this.catSpriteImagePath);
            const catFrameData = await fetch(this.catSpriteDataPath).then(r => r.json());
            const catSheet = new SpriteSheet(catImage, catFrameData); // one shared SpriteSheet (and one decoded image) even if multiple cats ever exist at once
            for (const cat of catEntities) {
                cat.animator = new Animator(catSheet); // each cat still needs ITS OWN Animator - frameIndex/elapsed are per-instance playback state, not shared
                cat.animator.play('idle');
            }
        }

        // NEW - the birthday cake's own art (Cake.js slices its 4 candle-
        // flicker frames out of this manually - see its render(), it
        // doesn't need a SpriteSheet/Animator instance the way Cat does).
        // Same "only fetch it if the level actually has one" gating as cat/
        // firework art - normal level-1 has no cake, so plain
        // `new PlayScene(game)` never pays for this fetch.
        const cakeEntities = this.level.entities.filter(entity => entity.tags?.has('cake'));
        if (cakeEntities.length > 0) {
            const cakeImage = await loadImage(this.cakeSpriteImagePath);
            for (const cake of cakeEntities) {
                cake.sprite = cakeImage; // one shared decoded image is enough - it's stateless art, not per-instance playback state
            }
        }

        // NEW - same gating idea as catEntities/cakeEntities above: only
        // fetch the firework's art if this level actually needs one, either
        // because a chest grants one (see Chest.js's grantsItem) or a cake
        // is going to launch a real (visible, not the invisible option -
        // see Firework.js's flag) batch of them on interact. Normal level-1
        // has neither, so plain `new PlayScene(game)` never pays for these
        // fetches.
        const hasFireworkChest = this.level.entities.some(entity => entity.grantsItem === 'firework')
            || cakeEntities.length > 0;
        if (hasFireworkChest) {
            this.fireworkRiseImage = await loadImage(this.fireworkRiseImagePath);
            const explodeImage = await loadImage(this.fireworkExplodeImagePath);
            const explodeFrameData = await fetch(this.fireworkExplodeDataPath).then(r => r.json());
            // Stored as a SHEET, not an Animator - same reasoning as catSheet
            // above: every rocket she launches needs its OWN Animator
            // instance (frameIndex/elapsed are per-instance state), but they
            // can all share this one decoded image + frame layout. A fresh
            // Animator gets built per rocket in update() below, right when
            // it's actually launched.
            this.fireworkExplodeSheet = new SpriteSheet(explodeImage, explodeFrameData);
        }

        this.player.position = new Vector2(this.level.playerStart.x, this.level.playerStart.y);

        // The current respawn point. There's no real checkpoint system yet, so this
        // just starts (and stays) at the level's playerStart - but Player.js reads
        // this through `world.respawnPoint` rather than reaching for level.playerStart
        // directly, so later a Checkpoint entity can simply do
        // `this.checkpoint = new Vector2(x, y)` (e.g. via an eventBus 'checkpointReached'
        // listener) and nothing in Player.js has to change.
        this.checkpoint = new Vector2(this.level.playerStart.x, this.level.playerStart.y);

        // Respawning teleports the player, but camera.follow()'s easing would otherwise
        // slowly drift the view back across the level toward the respawn point instead
        // of cutting there instantly - snapTo bypasses that easing for this one case.
        // This used to be wired up once in Game's constructor for the app's whole
        // lifetime; now it's scoped to PlayScene's lifetime instead, since there's no
        // player or level to snap the camera to outside of it. Subscribed here in
        // enter(), unsubscribed in exit() - see the note there.
        this.onPlayerDied = () => game.camera.snapTo(this.player, this.level.bounds);
        game.events.on('playerDied', this.onPlayerDied);

        // NEW - the little popup system used by MessageZone/Chest/Cat. Lives
        // here (not on Game) for the same reason the player/level do: it only
        // makes sense while a level is actually being played. Torn down again
        // in exit() below.
        this.messageBox = new MessageBox();
        this.onShowMessage = ({ text, duration }) => this.messageBox.showToast(text, duration);
        // UPDATED - chestOpened's payload now also carries grantsItem (see
        // Chest.js). Most chests leave it null and this is a no-op for them;
        // the one chest that passes 'firework' bumps this.inventory so
        // update() below knows she has a rocket ready to launch.
        this.onChestOpened = ({ message, grantsItem, grantsItemCount }) => {
            this.messageBox.showModal(message);
            if (grantsItem) {
                this.inventory[grantsItem] = (this.inventory[grantsItem] ?? 0) + (grantsItemCount ?? 1);
            }
        };
        game.events.on('showMessage', this.onShowMessage);
        game.events.on('chestOpened', this.onChestOpened);

        // NEW - the cake's payoff. Cake.js itself never touches
        // level.entities (same reason Chest doesn't reach into inventory
        // directly) - it just announces "go off, N of them, this spread
        // apart, this far apart in time" and this is what actually queues
        // that many launches. They DON'T spawn here immediately - each one
        // is dropped into this.pendingFireworks with its own countdown, and
        // update() below is what actually pushes each into level.entities
        // once its turn comes up. See update()'s "NEW - draining
        // pendingFireworks" block for the other half of this.
        this.onCakeTriggered = ({ fireworkCount, spread, delay, x, y }) => {
            for (let i = 0; i < fireworkCount; i++) {
                const offset = (i - (fireworkCount - 1) / 2) * spread;
                this.pendingFireworks.push({
                    remaining: i * (delay / 1000), // seconds until THIS one launches - i=0 goes immediately (remaining 0), each after it delay ms later
                    x: x + offset - 8, // -8 roughly centers the 16px-wide rocket on the offset point, same centering idea as the 'fireworks' key spawn below
                    y: y
                });
            }
        };
        game.events.on('cakeTriggered', this.onCakeTriggered);

        // NEW - this scene's own theme, loaded and started here instead of
        // by MenuScene before either button was even clicked. unlock() was
        // already called synchronously back in MenuScene's click handler
        // (has to be, per AudioManager's own note on unlock()'s gesture
        // requirement - by the time we're in this async enter(), that
        // window's long closed), so all that's left to do here is load and
        // play. playMusic() calls stopMusic() internally, so there's no
        // leftover-track case to worry about even if something upstream
        // ever changes.
        await game.audio.load(this.themeName, this.themePath);
        game.audio.playMusic(this.themeName);

        // Lets anything listening know setup is done - a HUD waiting to show itself,
        // an analytics hook, AudioManager unlocking its context, etc. Nothing currently
        // subscribes to this, but it costs nothing to emit and saves a refactor later.
        game.events.emit('gameReady');
    }

    // Mirrors the subscriptions in enter() - without this, dying, respawning, or
    // just navigating back to the menu and into a fresh PlayScene would stack up
    // duplicate listeners (and duplicate toast/modal DOM elements), each firing
    // against a stale (or worse, disposed) player/level reference.
    exit() {
        this.game.events.off('playerDied', this.onPlayerDied);
        this.game.events.off('showMessage', this.onShowMessage);
        this.game.events.off('chestOpened', this.onChestOpened);
        this.game.events.off('cakeTriggered', this.onCakeTriggered);
        this.messageBox.destroy();

        // NEW - stop this scene's theme on the way out. Without this, going
        // back to the menu (which plays nothing of its own) or into a
        // BirthdayScene (which starts its own track) would leave this
        // scene's music looping underneath whatever comes next forever,
        // since nothing else in the app ever calls stopMusic().
        this.game.audio.stopMusic();
    }

    // Runs every frame, before render() - advances the simulation by dt seconds.
    update(dt) {
        const { game } = this;

        // Same "bag of context" the player has always read tilemap/bounds/
        // respawnPoint out of - player/input/events are NEW additions to it,
        // added so entities like Chest/Cat/MessageZone can check "how close
        // is the player", "was interact just pressed", and "let me announce
        // something happened" without each one needing a totally different
        // update() signature, or PlayScene having to special-case every
        // entity type by hand.
        const world = {
            tilemap: this.level.tilemap,
            bounds: this.level.bounds,
            respawnPoint: this.checkpoint,
            player: this.player,
            events: game.events,
            input: game.input,
        };

        this.player.update(dt, world, game.input);

        // NEW - actually runs the entities LevelLoader has been spawning all
        // along. '?.' just in case some future entity type is purely visual
        // and has nothing to do every frame.
        for (const entity of this.level.entities) {
            entity.update?.(dt, world);
        }

        // NEW - launching a collected firework. Kept here rather than inside
        // Player.update() so Player.js doesn't need to change at all for
        // this - PlayScene already owns level.entities and already reads
        // this.player.position/size directly elsewhere below.
        if (this.inventory.firework > 0 && game.input.isKeyJustPressed('fireworks')) {
            this.inventory.firework--;
            this.spawnFirework(
                this.player.position.x + this.player.size.width / 2 - 8, // roughly centered on her, minus half the rocket's own placeholder width
                this.player.position.y
            );
        }

        // NEW - draining pendingFireworks (see onCakeTriggered above). Each
        // entry counts down its own `remaining` seconds; once it hits zero
        // it actually spawns and gets removed from the queue. Walking
        // BACKWARDS so splicing an entry out mid-loop doesn't skip the one
        // that shifts into its place, same reasoning CollisionSystem/etc.
        // use elsewhere for in-place array mutation during iteration.
        for (let i = this.pendingFireworks.length - 1; i >= 0; i--) {
            const pending = this.pendingFireworks[i];
            pending.remaining -= dt;
            if (pending.remaining <= 0) {
                this.spawnFirework(pending.x, pending.y);
                this.pendingFireworks.splice(i, 1);
            }
        }

        game.camera.follow(this.player, this.level.bounds);
    }

    // Builds a real, visible Firework and pushes it into level.entities -
    // shared by both launch paths (the 'fireworks' key above and a
    // triggered Cake's queue above) so the riseImage/explodeAnimator wiring
    // only has to be written once instead of copy-pasted at both call sites.
    spawnFirework(x, y) {
        const firework = new Firework(x, y);
        firework.riseImage = this.fireworkRiseImage ?? null;
        if (this.fireworkExplodeSheet) {
            firework.explodeAnimator = new Animator(this.fireworkExplodeSheet); // its OWN Animator instance per rocket - frameIndex/elapsed are per-instance playback state, not shared
        }
        // No separate "spawn" system exists yet - level.entities is just a
        // plain array, and the update/render loops above/below already
        // iterate it generically (entity.update?.(...) / entity.render?.(...)),
        // so pushing straight into it is enough for this new entity to
        // start being simulated and drawn from next frame on.
        this.level.entities.push(firework);
    }

    // Runs every frame, after update() - only draws, never changes game state.
    // Game.render() already cleared the canvas before calling this, so we
    // go straight to drawing the world on top of that.
    render(ctx) {
        const { game } = this;
        game.renderer.renderTilemap(this.level.tilemap, this.tileset, game.camera);

        // NEW - drawn BEFORE the player, so the player renders on top of
        // chests/the cat rather than potentially underneath them. Entities
        // with no render() of their own (MessageZone - it's invisible on
        // purpose) are skipped by the '?.' instead of needing a check here.
        for (const entity of this.level.entities) {
            entity.render?.(ctx, game.camera);
        }

        // Read the CURRENT frame's real width/height from the animator instead of a
        // hardcoded constant - that constant used to say 24x24 no matter what, so the
        // moment player2's 32x32 frames were swapped in, the art was centered/bottom-
        // aligned using the wrong numbers. This way any character's sprite (any frame
        // size) centers correctly with zero changes needed here.
        const frame = this.player.animator.getCurrentFrame();
        const offsetX = (frame.w - this.player.size.width) / 2;
        const offsetY = frame.h - this.player.size.height;

        const screenX = Math.round(this.player.position.x - game.camera.x - offsetX);
        const screenY = Math.round(this.player.position.y - game.camera.y - offsetY);

        // flipX used to be `facing === 'right'`, which mirrored the sprite for the
        // WRONG direction (moving right made it visually face left). Flip on 'left'
        // instead, so the sheet's own default-facing frames are drawn as-is when
        // facing that way, and mirrored only for the opposite direction.
        this.player.animator.draw(ctx, screenX, screenY, this.player.facing === 'left');
    }
}