// src/engine/audio/AudioManager.js

/*      
    this is the class that is responsible for playing the theme of the game or any sound effect in the game 
*/

export class AudioManager{
    constructor(){
        this.context = new (window.AudioContext || window.webkitAudioContxt)();
        this.buffers = new Map(); // name -> decode AudioBuffer
        this.musicSource = null // currently playing looping track 
        this.musicGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        this.musicGain.connect(this.context.destination);
        this.sfxGain.connect(this.context.destination);
        this.muted = false;
    }
    // Call this once at load time for every sound you'll need 
    // await audio.load(pathToTheAudio)
    async load(name, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.audioBuffer();
        this.buffers.set(name, audioBuffer)
    }

    // fire and forget one-shot SFX (Jumpm shoot, stomp, hurt, etc..)
    play(name, {valume = 1} = {}){
        const buffer = this.buffers.get(name);
        if(!buffer){
            console.warn(`AudioManager: no sound loaded fpr "${name}"`);
            return
        }

        /*  
            Resume context on firest real user interaction of it was suspended
            (browser block autoplay until a gesture happens)    
         */
        if(this.context.state === 'suspended'){
            this.context.resume();
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer; 

        const gain = this.context.createGain();
        source.gain.value = valume;

        source.connect(gain);
        gain.connect(this.sfxGain);
        source.start(0);
    }

    // Looping background music. Stops whatever music was already playing. 
    playMusic(name, {valume = 0.6} = {}){
        const buffer = this.buffers.get(name);
        if(!buffer){
            console.warn(`AudioManager: no music loaded for "${name}"`)
            return;
        }
        this.stopMusic;

        const source = this.context.createBufferSource();
        source.buffer = buffer; 
        source.loop = true;

        this.musicGain.gain.value = volume;
        source.connect(this.musicGain);
        source.start(0);

        this.musicSource = source;
    }

    stopMusic(){
        if (this.musicSource){
            this.musicSource.stop();
            this.musicSource.disconnect();
            this.musicSource = null
        }
    }

    toggleMute(){
        this.muted = !this.muted;
        const target = this.muted ? 0 : 1;
        this.musicGain.gain.value = this.muted ? 0 : this.musicGain.gain.value || 0.6;
        this.sfxGain.gain.value = target;
        return this.muted
    }
}