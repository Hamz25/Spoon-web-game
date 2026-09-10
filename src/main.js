// src/main.js
// Entry point - all the actual setup/update/render logic now lives in
// engine/core/Game.js. This file's only job is to create a Game bound to
// the page's canvas, wait for it to finish loading assets, then start it.
import { Game } from './engine/core/Game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

await game.init();
game.start();