// src/game/ui/MessageBox.js
/*
    Handles the two flavors of "text pops up on screen" this level needs:

      - toast: a small message near the bottom of the screen that fades
               in and, usually, disappears on its own a couple seconds
               later. Used for the walk-and-discover messages (see
               MessageZone.js) and for "Pet the kitty" (Cat.js) - though
               that one passes duration: 0, which means "don't auto-hide,
               just sit there until something replaces you".

      - modal: a bigger "window" with a Close button, used for chest
               messages (see Chest.js) - opening a chest feels like it
               deserves a proper pause-and-read moment instead of a quick
               toast that might vanish before she's done reading it.

    Both are just plain HTML elements overlaid on top of the <canvas> -
    the exact same trick MenuScene.js already uses for its Play button.
    Way less code than hand-drawing wrapped text and boxes with canvas
    fillText(), and it's free accessibility (real DOM text, a real
    clickable button) for basically no extra effort.
*/

export class MessageBox {
    constructor() {
        this.toastEl = document.createElement('div');
        this.toastEl.className = 'game-toast';
        document.body.appendChild(this.toastEl);
        this.toastTimer = null; // handle for the pending auto-hide setTimeout, so a NEW toast can cancel a still-running old one instead of getting hidden early by it

        // Built as one chunk of innerHTML rather than three separate
        // createElement calls - there's no dynamic list here, just a fixed
        // little card, so this is simpler to read than the equivalent
        // three-line createElement version would be.
        this.modalOverlayEl = document.createElement('div');
        this.modalOverlayEl.className = 'game-modal-overlay';
        this.modalOverlayEl.innerHTML = `
            <div class="game-modal">
                <p class="game-modal-message"></p>
                <button class="game-modal-close">Close</button>
            </div>
        `;
        document.body.appendChild(this.modalOverlayEl);

        this.modalMessageEl = this.modalOverlayEl.querySelector('.game-modal-message');
        this.closeButtonEl = this.modalOverlayEl.querySelector('.game-modal-close');

        // Same "store the bound handler so exit()/destroy() can remove the
        // exact same reference" pattern MenuScene.js already uses for its
        // Play button, so this never leaks a dangling listener.
        this.onCloseClick = () => this.hideModal();
        this.closeButtonEl.addEventListener('click', this.onCloseClick);
    }

    // duration is in ms. Pass 0 for a toast that stays up until something
    // else calls showToast() again (replacing it) or hideToast() explicitly -
    // see Cat.js's persistent "Pet the kitty" message.
    showToast(text, duration = 3000) {
        clearTimeout(this.toastTimer); // cancel whatever auto-hide was queued for the PREVIOUS toast - otherwise it could fire late and hide THIS one early
        this.toastEl.textContent = text;
        this.toastEl.classList.add('visible');

        if (duration > 0) {
            this.toastTimer = setTimeout(() => {
                this.toastEl.classList.remove('visible');
            }, duration);
        }
    }

    hideToast() {
        clearTimeout(this.toastTimer);
        this.toastEl.classList.remove('visible');
    }

    showModal(text) {
        this.modalMessageEl.textContent = text;
        this.modalOverlayEl.classList.add('visible');
    }

    hideModal() {
        this.modalOverlayEl.classList.remove('visible');
    }

    // Mirrors MenuScene's exit(): removes everything this class put on the
    // page and unhooks its own listener, so leaving the level (or reloading
    // it) never stacks up duplicate toasts/modals sitting in the DOM.
    destroy() {
        clearTimeout(this.toastTimer);
        this.closeButtonEl.removeEventListener('click', this.onCloseClick);
        this.toastEl.remove();
        this.modalOverlayEl.remove();
    }
}
