/**
 * @module
 * Small piece of router-owned state read by the layout: the last navigation's page title (for
 * a visually-hidden live region) and a one-shot flag for moving focus to `<v-main>` after a
 * real page change.
 */
import { ref } from 'vue';

/**
 * What the route announcer says after a navigation — the new page's title.
 *
 * Held here rather than in a store because it is the one piece of state the router writes and
 * `App.vue` renders, and nothing else reads. `App.vue` puts it inside a visually-hidden
 * `role="status"` region, so a screen-reader user hears the page change that a sighted visitor
 * sees (WCAG 4.1.3). A single-page app otherwise swaps its content in silence.
 */
export const routeAnnouncement = ref('');

/**
 * The main landmark's selector — `<v-main data-main-content>` in `LayoutDefault.vue`.
 */
export const MAIN_CONTENT = 'main[data-main-content]';

/**
 * Whether a page change is still waiting to hand focus to the main landmark.
 *
 * The router asks for the move in `afterEach`, but every view renders its own `LayoutDefault`,
 * so the `<v-main>` that exists at that moment is the OLD page's — about to unmount and take the
 * focus with it. The flag survives that swap: the layout that mounts next consumes it.
 */
let mainFocusPending = false;

/**
 * Asks for focus to land on the main landmark once the next page is in the DOM.
 */
export const requestMainFocus = () => {
    mainFocusPending = true;
};

/**
 * Moves focus to the main landmark if a page change asked for it, and clears the request.
 *
 * @returns `true` when focus was moved.
 */
export const consumeMainFocus = () => {
    if (!mainFocusPending) return false;
    const main = document.querySelector<HTMLElement>(MAIN_CONTENT);
    if (!main) return false;
    mainFocusPending = false;
    main.focus({ preventScroll: true });
    return true;
};
