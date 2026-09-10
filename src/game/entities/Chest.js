// src/game/entities/Chest.js
/*
    A treasure chest the player can walk up to and open with the interact
    key (E). It isn't really about loot - it's a fun little wrapper around
    handing the player a written surprise, instead of just slapping the
    message on screen the second she walks past it.

    Chest doesn't know or care HOW its message gets shown - it just emits
    'chestOpened' on the shared event bus and lets whoever's listening
    (PlayScene, see its onChestOpened) decide that it should be a popup
    window. Same "don't reach across systems directly" idea as EventBus.js
    already explains for CollisionSystem/AudioManager.

    UPDATED: a chest can now optionally hand the player an item when it's
    opened (see `grantsItem` below). This is what lets exactly ONE chest
    (not every chest) give her a firework she can later set off - see
    BirthdayScene.js's chest_2 factory and PlayScene's onChestOpened /
    update(). Every other chest just leaves grantsItem as null and behaves
    exactly like before - this is opt-in, not a new requirement.

    UPDATED AGAIN: a chest can now also produce its message as ready-to-
    insert HTML (see getMessageHTML() below), for whichever UI ends up
    rendering the popup - if MessageBox.js (or whatever ends up listening
    to 'chestOpened') wants to show this as an actual DOM element instead
    of drawing text on the canvas, it doesn't have to duplicate the
    "wrap the message, mention the item" formatting itself. Chest still
    doesn't touch the DOM or insert anything itself - same "don't reach
    across systems" rule the rest of this file already follows - it just
    hands back a string and lets the listener decide where it goes.
    UPDATED AGAIN: a chest can now grant more than one of its item at once
    (see `grantsItemCount` below). This is just a plain count riding along
    next to `grantsItem` - a chest that hands out a stack of 3 fireworks is
    still just a chest, same as the single-item case. Defaults to 1 so every
    existing chest (which never set this) keeps handing out exactly one item,
    same as before this was added.
*/
import Entity from "./Entity.js";
import Vector2 from "../../engine/core/Vector2.js";
import { intersects } from "../../engine/physics/AABB.js"; // reusing the SAME overlap test CollisionSystem uses - no reason to reinvent this

const INTERACT_RANGE = 20; // px of extra "breathing room" padded around the chest's tiny hitbox before the player counts as close enough - requiring pixel-perfect overlap on a 16x16 box would make chests feel finicky and annoying to open

// Escapes the handful of characters that matter for safe innerHTML use.
// A chest's message is just level-design text today (nobody's typing HTML
// into a level JSON on purpose), but getMessageHTML() below still runs
// every message through this - so a stray '&', '<', or quote in someone's
// birthday note can never accidentally break the popup's markup instead of
// just showing up as itself.
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Tile IDs inside tilemap_packed.png (18px tiles, 20 cols/row - see
// Tileset.js's rectFor for the id<->grid formula: id = row*columns + col + 1).
// Both chests live in the SAME sheet PlayScene already loads for the level's
// tileset, so no separate image/fetch is needed - see PlayScene.enter(),
// which now hands every chest entity that same Tileset instance.
const DEFAULT_CLOSED_TILE_ID = 10; // gold chest, plain lid (col 9, row 0)
const DEFAULT_OPEN_TILE_ID = 12;   // gold chest, lid open + treasure showing (col 11, row 0)

export default class Chest extends Entity {
    constructor(x, y, message = "You found a little surprise!", grantsItem = null,
        grantsItemCount = 1,
        closedTileId = DEFAULT_CLOSED_TILE_ID, openTileId = DEFAULT_OPEN_TILE_ID) {
        super(); // sets up position/velocity/size/tags/etc. with Entity's defaults, which we immediately override below
        this.position = new Vector2(x, y);
        this.size = { width: 18, height: 18 }; // matches the tile's native 18x18 size, so the sprite draws pixel-perfect instead of being squished into the old 16x16 placeholder box
        this.tags.add('chest');

        // Assigned by PlayScene right after construction, same pattern as
        // Cat/Player getting their animator handed to them post-spawn -
        // Chest itself never loads an image, it just borrows PlayScene's
        // already-loaded tileset.
        this.tileset = null;
        this.closedTileId = closedTileId;
        this.openTileId = openTileId;

        this.message = message; // the actual birthday text that shows up once this chest is opened
        this.opened = false;    // once true, this chest stays open FOREVER - re-triggering the popup every time she wanders back past it would get old fast
        this.promptShown = false; // whether we've already nudged her with "Press E to open" on THIS approach, so it doesn't re-fire every single frame she happens to be standing nearby

        // NEW - the "unique ID" for which chest gives what. Just a plain
        // string (e.g. 'firework') instead of a whole new Chest subclass -
        // a chest that hands out an item is still just a chest, only the
        // payload of its chestOpened event changes. Stays null by default so
        // ordinary chests (chest_1, every message chest, etc.) are completely
        // unaffected.
        this.grantsItem = grantsItem;

        // NEW - how many of `grantsItem` this chest hands over at once.
        // Stays 1 for every chest that never set this explicitly, so a
        // single-firework chest like chest_2 behaves exactly as before.
        this.grantsItemCount = grantsItemCount;
    }

    // Builds this chest's message as a small self-contained HTML snippet -
    // a container div with the message text, plus an extra line naming the
    // granted item when grantsItem is set (ordinary message-only chests
    // just get the one line, same info they already carry either way).
    // Whoever renders 'chestOpened' can drop this straight into an
    // element's innerHTML instead of re-building the same markup from
    // `message`/`grantsItem` separately. Class names are left generic
    // (`chest-message`, `chest-message__text`, `chest-message__item`) so
    // MessageBox.js's own stylesheet defines how this actually looks -
    // Chest only owns the content and structure, not the visual style.
    getMessageHTML() {
        const textHTML = `<p class="chest-message__text">${escapeHTML(this.message)}</p>`;
        const itemHTML = this.grantsItem
            ? `<p class="chest-message__item">You received: ${escapeHTML(this.grantsItem)}${this.grantsItemCount > 1 ? ` x${this.grantsItemCount}` : ""}</p>`
            : "";
        return `<div class="chest-message">${textHTML}${itemHTML}</div>`;
    }

    // Grows the chest's own AABB outward by INTERACT_RANGE on every side, so
    // "close enough to open" feels generous rather than requiring the
    // player's hitbox to be touching the chest's hitbox exactly.
    #interactAABB() {
        const box = this.getAABB();
        return {
            x: box.x - INTERACT_RANGE,
            y: box.y - INTERACT_RANGE,
            width: box.width + INTERACT_RANGE * 2,
            height: box.height + INTERACT_RANGE * 2,
        };
    }

    // world here follows the same "bag of context" pattern Player.update()
    // already reads tilemap/bounds/respawnPoint from - PlayScene just adds
    // player/input/events into that same bag so entities like this one can
    // reach them too, without every entity needing a totally different
    // update() signature.
    update(dt, world) {
        if (this.opened) return; // nothing left to check once it's already open

        const { player, input, events } = world;
        const nearby = intersects(this.#interactAABB(), player.getAABB());

        if (nearby && !this.promptShown) {
            this.promptShown = true; // fire the hint ONCE per approach, not every frame she's standing here
            events.emit('showMessage', { text: 'Press E to open', duration: 1800 });
        }
        if (!nearby) {
            this.promptShown = false; // walked away without opening it - reset so wandering back triggers the hint again
        }

        if (nearby && input.isKeyJustPressed('interact')) {
            this.opened = true;
            // grantsItem rides along on the SAME event - PlayScene's
            // onChestOpened already has to unpack this payload to show the
            // message, so it's the natural place for it to also check
            // whether an item should be added to her inventory, rather than
            // firing a second separate event for basically the same moment.
            // `html` is additive - message/grantsItem are still here
            // unchanged for any listener that builds its own view, an HTML
            // one just doesn't have to re-derive the same markup itself.
            events.emit('chestOpened', {
                message: this.message,
                grantsItem: this.grantsItem,
                grantsItemCount: this.grantsItemCount,
                html: this.getMessageHTML(),
            }); // PlayScene turns this into an actual on-screen window - see its onChestOpened listener
        }
    }

    // There's no chest spritesheet yet, so this draws a plain rectangle -
    // just enough to be VISIBLE and testable in the meantime. The moment
    // there's real chest art, swap this for an Animator/SpriteSheet draw,
    // same pattern PlayScene already uses for the player.
    render(ctx, camera) {
        const screenX = Math.round(this.position.x - camera.x);
        const screenY = Math.round(this.position.y - camera.y);

        if (this.tileset) {
            const tileId = this.opened ? this.openTileId : this.closedTileId;
            const [sx, sy, sw, sh] = this.tileset.rectFor(tileId); // same source-rect convention Renderer.renderTilemap() already uses for the tilemap itself
            ctx.drawImage(this.tileset.image, sx, sy, sw, sh, screenX, screenY, this.size.width, this.size.height);
            return;
        }

        // Fallback if no tileset was ever assigned (e.g. testing Chest in isolation) -
        // same plain-rectangle placeholder as before.
        ctx.fillStyle = this.opened ? '#c9a24b' : '#8b5a2b';
        ctx.fillRect(screenX, screenY, this.size.width, this.size.height);
    }
}