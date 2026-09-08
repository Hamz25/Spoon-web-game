// src/engine/audio/AudioManager.js
/*
  Wraps the Web Audio API for one-shot SFX and looping music, with a mute
  toggle. Browsers block audio from playing at all until a real user
  gesture (click/keydown) happens on the page - see unlock() below, which
  MenuScene calls synchronously from inside its own gesture handler.
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
        this.muted = false;
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
    playMusic(name, { volume = 0.6 } = {}) {
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

    toggleMute() {
        this.muted = !this.muted;
        const target = this.muted ? 0 : 1;
        this.musicGain.gain.value = this.muted ? 0 : (this.musicGain.gain.value || 0.6);
        this.sfxGain.gain.value = target;
        return this.muted;
    }
}