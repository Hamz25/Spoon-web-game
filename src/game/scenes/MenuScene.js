// src/game/scenes/MenuScene.js

/*
  The first screen the player sees. Its only real job is to get out of the
  way and hand off to PlayScene - so rather than teach the canvas how to
  hit-test mouse clicks against a drawn rectangle (which would mean giving
  InputManager a whole mouse-handling responsibility it doesn't have yet,
  just for one button), this overlays a real HTML <button> on top of the
  canvas. Free accessibility, free click handling, and it's removed in
  exit() so it can never linger over a scene that isn't the menu.

  UPDATED: added a second button for the birthday level. It's the exact
  same pattern as the original Play button (own bound handler, own
  disable-while-loading, own cleanup in exit()) just pointed at
  BirthdayScene instead of PlayScene - copy-pasted on purpose rather than
  "cleverly" merged into one parameterized button, since two buttons that
  each do one obvious thing are easier to read than one button juggling a
  branch.

  UPDATED AGAIN: menu no longer touches music at all. It used to
  preload/play a single shared theme here so it'd be ready by the time
  either button was clicked, but that meant every scene got the same
  song whether it wanted it or not. Each destination scene now loads and
  plays its own theme in its own enter() (and stops it in its own exit()),
  which is more loading code per-scene but keeps MenuScene honest about
  its one job: get out of the way.
*/
import '../../style.css'
import { Scene } from './Scene.js';
import { PlayScene } from './PlayScene.js';
import { BirthdayScene } from './BirthdayScene.js';

export class MenuScene extends Scene {
    async enter() {
        // this.playButton = document.createElement('button');
        // this.playButton.textContent = 'Play';
        // this.playButton.className = 'menu-play-button';

        // Stored as a bound reference (not an inline arrow passed straight
        // to addEventListener) so exit() can pass the exact same reference
        // to removeEventListener - otherwise the listener would outlive the
        // button being removed from the DOM and quietly leak.

        // this.onClick = () => this.handlePlayClick();
        // this.playButton.addEventListener('click', this.onClick);
        // document.body.appendChild(this.playButton);

        // NEW - the birthday surprise button. Sits just below the normal
        // Play button (see .menu-birthday-button in style.css, which only
        // adjusts position - everything else reuses .menu-play-button's look).
        this.birthdayButton = document.createElement('button');
        this.birthdayButton.textContent = 'This is for you';
        this.birthdayButton.className = 'menu-play-button menu-birthday-button';
        this.onBirthdayClick = () => this.handleBirthdayClick();
        this.birthdayButton.addEventListener('click', this.onBirthdayClick);
        document.body.appendChild(this.birthdayButton);

        // No audio preloading here anymore - see the file-header note.
        // Whichever scene the player picks is responsible for its own
        // theme now, so there's nothing for the menu to kick off.
    }

    // async handlePlayClick() {
    //     // Disabling immediately, before the await, closes the window where
    //     // a fast double-click could fire changeScene() twice and race two
    //     // PlayScenes loading at once. The label change is just a visual
    //     // acknowledgment that the level is now fetching in the background.
    //     this.playButton.disabled = true;
    //     this.playButton.textContent = 'Loading...';
    //     this.birthdayButton.disabled = true; // also lock the OTHER button - otherwise clicking it right after would race a second scene load on top of this one

    //     // Synchronous, still inside the click's call stack - must stay before
    //     // any await below, or the browser won't count this as gesture-triggered
    //     // and audio.playMusic() will silently fail to make a sound. PlayScene
    //     // is the one that'll actually call playMusic() now, but the unlock
    //     // still has to happen here, in the real click handler, or its
    //     // gesture context is gone by the time PlayScene.enter() runs.
    //     this.game.audio.unlock();

    //     await this.game.changeScene(new PlayScene(this.game));
    // }

    // Mirrors handlePlayClick() above, just pointed at BirthdayScene.
    async handleBirthdayClick() {
        this.birthdayButton.disabled = true;
        this.birthdayButton.textContent = 'Loading...';
        // this.playButton.disabled = true; // lock the OTHER button too, same reasoning as above

        // Same gesture-unlock requirement as handlePlayClick() - see the
        // comment there. BirthdayScene.enter() does its own load/play.
        this.game.audio.unlock();

        await this.game.changeScene(new BirthdayScene(this.game));
    }

    // Mirrors enter(): whatever got created/subscribed there gets torn down
    // here. Nothing about the menu should survive past this call.
    exit() {
        // this.playButton.removeEventListener('click', this.onClick);
        // this.playButton.remove();
        this.birthdayButton.removeEventListener('click', this.onBirthdayClick);
        this.birthdayButton.remove();
    }

    update(dt) {}

    render(ctx) {
        // No fillRect for the background here - Game.render() already
        // cleared the canvas with worldColor before calling this, so
        // drawing our own background would just be redundant work.
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('I really hope you like it ', ctx.canvas.width / 2, ctx.canvas.height / 2 - 40);
    }
}