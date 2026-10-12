/**
 * @module
 * `v-table` scrolls sideways inside an inner `.v-table__wrapper` div, which it gives no way to
 * focus or name. A mouse user can scroll it; a keyboard user cannot (axe `scrollable-region-focusable`).
 * This directive goes on the `v-table` and puts `tabindex=0`, `role=region` and a name on that inner
 * div, so arrow keys scroll it and a reader announces it.
 */
import type { Directive } from 'vue';

/** Vuetify's own class for the scrolling div inside `v-table`. */
const WRAPPER_SELECTOR = '.v-table__wrapper';

/**
 * Makes the scroller inside a `v-table` keyboard-reachable and named.
 *
 * Usage: `<v-table v-focusable-scroll="'Revenue'">`. The value is the region's accessible name.
 * Without a name the region is still focusable, but is not announced as a landmark.
 */
export const vFocusableScroll: Directive<HTMLElement, string | undefined> = {
    mounted: (element, { value }) => {
        const wrapper = element.querySelector<HTMLElement>(WRAPPER_SELECTOR);
        if (!wrapper) return;
        wrapper.tabIndex = 0;
        if (!value) return;
        wrapper.setAttribute('role', 'region');
        wrapper.setAttribute('aria-label', value);
    },
    updated: (element, { value }) => {
        const wrapper = element.querySelector<HTMLElement>(WRAPPER_SELECTOR);
        if (!wrapper || !value) return;
        wrapper.setAttribute('aria-label', value);
    }
};
