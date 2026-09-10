// src/engine/assets/AssetLoader.js
/*  This is the Logic of the Loader it will load any asset if it is audio or an image
    it should return a promise because we are working with the browser we need everything loaded before we can run the game
    and because Images load asynchronously in the browser */

// the function will take the image path as the parameter
// this function will load the image files only, and returns a Promise so the caller can 'await' it
export function loadImage(path) {
    return new Promise((resolve, reject) => {
        const image = new Image(); // create the actual image element

        image.onload = () => resolve(image); // once the browser finishes loading it, resolve the promise with the loaded image
        image.onerror = () => reject(new Error(`Failed to load image: ${path}`)); // if loading fails, reject with a useful error

        image.src = path; // set the source LAST - handlers must be attached BEFORE this, or a fast/cached load could fire before you're listening
    });
}

// this function loads the audio files with the same logic as above 
export function loadAudio(path) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();

        // the audio should be played throgh not just loaded 
        audio.oncanplaythrough = () => resolve(audio);
        audio.onerror = () => reject(new Error(`Failed to load Audio file: ${path}`));

        audio.src = path;
    })
}