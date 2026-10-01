/**
 * @module
 * A dialog with no `activator` has nobody for Vuetify to hand focus back to: the button that opened
 * it is a separate element. Close it with Escape and focus falls to the page body, so a keyboard
 * user starts again from the top of the page. This remembers the opener and puts focus back.
 */
import { nextTick, watch } from 'vue';

/**
 * Returns focus to whatever held it when a dialog opened, once the dialog closes.
 *
 * Nothing happens when the dialog was opened with nothing focused (a timer, a redirect) or when
 * the opener has left the page by the time the dialog closes: there is nowhere to return to.
 *
 * @param isOpen - reads whether the dialog is open. A getter, so it follows a model, a computed or a store flag alike.
 */
export const useReturnFocus = (isOpen: () => boolean): void => {
    /**
     * The element that had focus when the dialog opened.
     */
    let opener: HTMLElement | undefined;

    // Vue `watch` runs before the DOM update by default, which is what is wanted on open: Vuetify
    // has not yet moved focus into the dialog, so `activeElement` is still the opener.
    // https://vuejs.org/api/reactivity-core.html#watch
    watch(isOpen, (open) => {
        if (open) {
            const { activeElement, body } = document;
            opener =
                activeElement instanceof HTMLElement && activeElement !== body
                    ? activeElement
                    : undefined;
            return;
        }
        const target = opener;
        opener = undefined;
        // After the update, so the closing dialog no longer owns focus when it is handed back.
        if (target?.isConnected) void nextTick(() => target.focus({ preventScroll: true }));
    });
};
