// src/game/scenes/BirthdayScene.js
/*
    The birthday surprise level! This is just a PlayScene pointed at a
    different level file and a different set of entity factories - nothing
    about HOW a level loads, updates, or renders needed to change for this,
    so rather than copy-paste all of PlayScene and let the two slowly drift
    apart, this simply IS a PlayScene with different config baked into its
    constructor. See the `options` param PlayScene.js now accepts.

    Still uses the SAME player-sprite.png / player-sprite.json as the normal
    level (she controls the same little character) - only the tileset,
    level layout, and entities are different. If she wants a totally
    different look for the player just in this level, add
    spriteImagePath/spriteDataPath overrides here too, same as
    tilesetImagePath below.

    UPDATED: now also overrides themePath/themeName, since PlayScene plays
    a per-scene theme instead of MenuScene playing one shared theme for
    everything. Kept bd-theme.mp3 pointed at the ORIGINAL theme file (the
    one that used to play everywhere) since that song was written with this
    level in mind - level-1 is the one that got a new track out of this
    change, not the other way around. themeName is just given its own key
    so this doesn't collide in AudioManager's buffer map with whatever
    level-1 ends up using.

    UPDATED AGAIN: chest_2 is now THE unique chest that grants the firework
    item (see Chest.js's grantsItem and PlayScene's onChestOpened/update()).
    chest_1 and all three message zones are untouched - grantsItem defaults
    to null everywhere it isn't explicitly passed, so they behave exactly as
    before.

    UPDATED AGAIN: LevelLoader now calls factories with the FULL entity
    object (not just x, y) - see LevelLoader.js. test.json's message zones
    all use "type": "messageZone" (not message_1/2/3) and each one carries
    its OWN unique "message" string right in the JSON. So there's now a
    single "messageZone" factory below that reads e.message instead of
    three separate factories with hardcoded text baked in here. This means
    test.json can define any number of message zones, each saying whatever
    it wants, without touching this file again. message_1/2/3 are kept
    around too in case any level JSON still references those specific type
    names.

    UPDATED AGAIN: levelPath now points at level-birthday.json (built with
    world-builder.html) instead of test.json, and chest/cake got the same
    "generic factory reads its own fields off the entity" treatment
    messageZone already had - see the new "chest" and "cake" factories
    below and their comments. chest_1/chest_2/message_1/2/3 are left in
    place for any older level file that still uses those exact type names,
    same reasoning as before.
*/
import { PlayScene } from './PlayScene.js';
import Chest from '../entities/Chest.js';
import Cat from '../entities/Cat.js';
import MessageZone from '../entities/MessageZone.js';
import Cake from '../entities/Cake.js';

export class BirthdayScene extends PlayScene {
    constructor(game) {
        super(game, {
            levelPath: '/assets/levels/level-birthday.json',
            tilesetImagePath: '/assets/tiles/tilemap_packed.png', // reusing the normal tileset for now - point this at new art the moment there's a birthday-specific tileset image

            // Keeping the original shared theme here, since it was written
            // for this level specifically. themeName just needs to be
            // distinct from level-1's so the two never stomp each other in
            // AudioManager's buffer map.
            themePath: '/assets/audio/bd-theme.mp3',
            themeName: 'birthday-theme',

            // Each factory now takes the FULL entity object LevelLoader read
            // straight out of the level JSON's "entities" list - see
            // loadLevel() in LevelLoader.js. That means a factory can pull
            // out e.x/e.y for position AND any extra per-entity fields the
            // JSON provides (e.g. messageZone's own "message" text), rather
            // than every message needing to be hardcoded here keyed by a
            // type name like "message_1".
            entityFactories: {
                cat: (e) => new Cat(e.x, e.y),

                // NEW - the level-birthday.json exported by world-builder
                // (see world-builder.html's "Chest" entity kind) writes
                // every chest with the SAME generic "chest" type, carrying
                // its own message/grantsItem/tile-id fields right on the
                // entity - exactly the same shift messageZone already went
                // through below. This is what was actually missing and
                // throwing "no entity factory registered for type 'chest'":
                // the level JSON has "chest", not "chest_1"/"chest_2", so
                // neither of those two factories below ever matched it.
                chest: (e) => new Chest(e.x, e.y, e.message, e.grantsItem, e.grantsItemCount, e.closedTileId, e.openTileId),

                // NEW - same idea as "chest" above: world-builder's new
                // "Cake" entity kind (see world-builder.html) exports
                // { type: "cake", x, y, fireworkCount, triggerKey,
                // fireworkSpread, fireworkDelay, fireworkRange } - this reads
                // those fields straight off the entity so any number of
                // cakes, each with their own key/spacing/range, can be
                // placed without editing this file again. spread/delay/range
                // are passed through as-is; Cake.js's own constructor
                // defaults (40px/300ms/160px) cover any OLDER level JSON
                // exported before those fields existed, where
                // e.fireworkSpread/e.fireworkDelay/e.fireworkRange are simply
                // undefined. UPDATED: Cake.js no longer fires one batch of
                // fireworkCount rockets and stops - it now loops forever,
                // sweeping a single launch point back and forth (spread px
                // per step, delay ms apart) capped at +-fireworkRange px from
                // the cake. fireworkCount is still read/passed here for
                // compatibility with existing level JSON, but Cake.js itself
                // no longer uses it.
                cake: (e) => new Cake(e.x, e.y, e.fireworkCount, e.triggerKey, e.fireworkSpread, e.fireworkDelay, e.fireworkRange),

                // Kept for any OLDER level JSON that still hardcodes these
                // specific type names instead of the generic "chest" above -
                // same reasoning as message_1/2/3 being kept below.
                chest_1: (e) => new Chest(e.x, e.y,
                    "Happy Birthday! I made you your very own level to walk through 🎂"),

                // Still THE one chest that hands her a firework to launch
                // later (5th arg to Chest is unused, grantsItem is the 4th).
                chest_2: (e) => new Chest(e.x, e.y,
                    "I hope this year brings you everything you're hoping for, and then some.",
                    'firework'),

                // NEW - matches "type": "messageZone" used in test.json.
                // Reads the message text straight off the entity instead of
                // hardcoding it here, so each messageZone in the JSON can
                // say something different (see test.json's three entries).
                messageZone: (e) => new MessageZone(e.x, e.y, e.message),

                // Kept for any level JSON that still uses these specific
                // type names instead of a generic "messageZone".
                message_1: (e) => new MessageZone(e.x, e.y,
                    "Hey... yeah, you. Keep walking :)"),
                message_2: (e) => new MessageZone(e.x, e.y,
                    "This whole level exists just for you."),
                message_3: (e) => new MessageZone(e.x, e.y,
                    "Almost there..."),
            },
        });
    }
}