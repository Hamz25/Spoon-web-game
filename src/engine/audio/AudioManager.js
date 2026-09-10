// src/engine/audio/AudioManager.js
/*
  Wraps the Web Audio API for one-shot SFX and looping music, with a mute
  toggle. Browsers block audio from playing at all until a real user
  gesture (click/keydown) happens on the page - see unlock() below, which
  MenuScene calls synchronously from inside its own gesture handler.

  UPDATED: `muted` is no longer its own independent field - it's now
  DERIVED from volume (muted === volume is 0). The previous version let
  `muted: true` and `volume: 0.6` both be true at once, which is exactly
  the split-brain state that made "drag the slider to 0" and "is muted"
  two different questions with two different answers. Tying them together
  means there's only one source of truth: the gain itself.

  That still leaves one problem: if muted is JUST "volume is 0", clicking
  a mute BUTTON needs to restore to *something* other than 0, or clicking
  it again does nothing. `previousVolume` exists solely for that - it's
  the last volume that was actually audible, remembered so the mute
  button has something to put back.
*/

export class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = new Map();   // name -> decoded AudioBuffer
        this.musicSource = null;    // currently playing looping track (if any)
        this.musicGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        this.musicGain.connect(this.context.destination);
        this.sfxGain.connect(this.context.destination);

        // NEW - `volume` is now the single source of truth. 0 means muted;
        // anything above 0 means audible at that level. `previousVolume` is
        // ONLY for the mute button's restore step (see toggleMute()) - it's
        // never read anywhere else.
        this.volume = 0.6;
        this.previousVolume = 0.6;
    }

    // NEW - replaces the old plain `this.muted` field. Computed, not
    // stored, so it's impossible for this to disagree with `volume` the
    // way two separately-set fields could.
    get muted() {
        return this.volume === 0;
    }

    // Must be called SYNCHRONOUSLY from inside a real user gesture handler
    // (a 'click' or 'keydown' callback), before any `await`. Browsers tie
    // the permission to play audio to the gesture's call stack, not to
    // whether a gesture happened at some point earlier - calling this after
    // an `await` (e.g. after loading files) can silently fail to unlock.
    unlock() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    // Call this once at load time for every sound you'll need, e.g.
    // await audio.load('jump', '/assets/audio/jump.wav'). Safe to call
    // even before unlock() - loading and decoding don't need audio to be
    // "unlocked", only actually playing does.
    async load(name, url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`AudioManager: failed to fetch "${url}" (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
    }

    // Fire-and-forget one-shot SFX (jump, shoot, stomp, hurt, etc.)
    play(name, { volume = 1 } = {}) {
        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`AudioManager: no sound loaded for "${name}"`);
            return;
        }
        this.unlock(); // defensive - in case something plays a sound before the menu's gesture ran

        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const gain = this.context.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.sfxGain);
        source.start(0);
    }

    // Looping background music. Stops whatever music was already playing.
    // `volume` still defaults to the current setting, and since `muted` is
    // now just "is volume 0", there's no separate mute check needed here
    // anymore - a muted AudioManager's own `this.volume` IS 0, so this
    // naturally starts the track silent without any extra branching.
    playMusic(name, { volume = this.volume } = {}) {
        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`AudioManager: no music loaded for "${name}"`);
            return;
        }
        this.unlock();
        this.stopMusic();

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        this.musicGain.gain.value = volume;
        source.connect(this.musicGain);
        source.start(0);

        this.musicSource = source;
    }

    stopMusic() {
        if (this.musicSource) {
            this.musicSource.stop();
            this.musicSource.disconnect();
            this.musicSource = null;
        }
    }

    // CHANGED - this is what makes "volume 0 == muted" true everywhere,
    // not just in the getter above: setting volume to 0 IS how you mute
    // now, whether that came from dragging the slider all the way down or
    // from toggleMute() below. `previousVolume` only updates when the
    // incoming value is non-zero, so it always holds the last audible
    // level, never 0 itself.
    setVolume(value) {
        this.volume = value;
        if (value > 0) {
            this.previousVolume = value;
        }
        this.musicGain.gain.value = value;
        this.sfxGain.gain.value = value > 0 ? 1 : 0;
    }

    // CHANGED - no longer flips a separate boolean. Flips between 0 and
    // `previousVolume` by going through setVolume(), so muting via the
    // BUTTON and muting via the SLIDER end up in the exact same state
    // afterward - there's no longer a "muted but volume says 0.6" or
    // "unmuted but volume says 0" case either path can produce.
    toggleMute() {
        if (this.muted) {
            this.setVolume(this.previousVolume || 0.6);
        } else {
            this.setVolume(0);
        }
        return this.muted;
    }
}