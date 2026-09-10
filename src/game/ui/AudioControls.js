// src/game/ui/AudioControls.js
/*
  The mute+volume control. Lives on Game (constructed once in Game's
  constructor, right after `this.audio`), NOT on any Scene - unlike
  MenuScene's Play/Birthday buttons, which are created in enter() and
  removed in exit() because they only make sense while that one scene is
  active, this needs to survive every scene transition untouched. There is
  no enter()/exit() pair here on purpose: this class's whole lifetime IS
  the app's lifetime, same as AudioManager itself.

  UPDATED: no emoji. There's no icon asset anywhere in this project yet
  (checked - no /assets/icons, no icon font import), so rather than pull
  in a dependency for two icons, ICON_SPEAKER/ICON_MUTED below are tiny
  hand-drawn 8x8-grid pixel SVGs, same "no external asset needed" spirit
  as the CSS-only stepped-shadow border in style.css. Swap these for real
  art the moment there's a proper icon set - they're deliberately simple
  placeholders, not a design statement.

  UPDATED: layout is vertical now (see .audio-controls / .audio-volume-
  slider in style.css) - button on top, slider running downward beneath
  it, instead of side-by-side.
*/
import '../../style.css'

// Speaker with sound waves - shown when volume > 0.
const ICON_SPEAKER = `
<svg viewBox="0 0 8 8" width="16" height="16" shape-rendering="crispEdges">
  <rect x="0" y="3" width="2" height="2" fill="currentColor"/>
  <rect x="2" y="2" width="1" height="4" fill="currentColor"/>
  <rect x="3" y="1" width="1" height="6" fill="currentColor"/>
  <rect x="5" y="2" width="1" height="1" fill="currentColor"/>
  <rect x="6" y="3" width="1" height="2" fill="currentColor"/>
  <rect x="5" y="5" width="1" height="1" fill="currentColor"/>
</svg>`;

// Same speaker base, waves replaced with an X - shown when muted (volume 0).
const ICON_MUTED = `
<svg viewBox="0 0 8 8" width="16" height="16" shape-rendering="crispEdges">
  <rect x="0" y="3" width="2" height="2" fill="currentColor"/>
  <rect x="2" y="2" width="1" height="4" fill="currentColor"/>
  <rect x="3" y="1" width="1" height="6" fill="currentColor"/>
  <rect x="5" y="1" width="1" height="1" fill="currentColor"/>
  <rect x="6" y="2" width="1" height="1" fill="currentColor"/>
  <rect x="5" y="4" width="1" height="1" fill="currentColor"/>
  <rect x="6" y="5" width="1" height="1" fill="currentColor"/>
</svg>`;

export class AudioControls {
    constructor(audio) {
        this.audio = audio;

        this.container = document.createElement('div');
        this.container.className = 'audio-controls';

        this.muteButton = document.createElement('button');
        this.muteButton.className = 'audio-mute-button';
        this.muteButton.setAttribute('aria-label', 'Toggle mute');
        this.onMuteClick = () => this.handleMuteClick();
        this.muteButton.addEventListener('click', this.onMuteClick);

        this.slider = document.createElement('input');
        this.slider.type = 'range';
        this.slider.className = 'audio-volume-slider';
        this.slider.min = '0';
        this.slider.max = '1';
        this.slider.step = '0.05';
        this.slider.value = String(this.audio.volume);
        this.slider.setAttribute('aria-label', 'Music volume');
        this.onSliderInput = (e) => this.handleSliderInput(e);
        this.slider.addEventListener('input', this.onSliderInput);

        this.container.appendChild(this.muteButton);
        this.container.appendChild(this.slider);
        document.body.appendChild(this.container);

        this.syncUI();
    }

    handleMuteClick() {
        this.audio.toggleMute();
        this.syncUI();
    }

    // CHANGED - no more manual "if muted, unmute first" branch. Now that
    // `muted` is just `volume === 0` (see AudioManager.js), setVolume()
    // dragged to anything above 0 unmutes automatically as a side effect -
    // there's nothing left for this handler to do except forward the value.
    handleSliderInput(e) {
        this.audio.setVolume(parseFloat(e.target.value));
        this.syncUI();
    }

    // Single source of truth for what the button/slider should look like,
    // driven entirely off AudioManager's own state. Note the slider is
    // NEVER disabled, even at volume 0/muted - the whole point of tying
    // mute to volume is that dragging it back up is how you unmute, so
    // disabling it at the one moment you'd need to drag it would defeat
    // that.
    syncUI() {
        this.muteButton.innerHTML = this.audio.muted ? ICON_MUTED : ICON_SPEAKER;
        this.muteButton.classList.toggle('is-muted', this.audio.muted);
        this.slider.value = String(this.audio.volume);
    }
}