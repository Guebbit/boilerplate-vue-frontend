/**
 * @module
 * A reactive CSS media query: `useMediaQuery('(hover: hover)')` is a ref that follows the device.
 *
 * Vuetify reads `matchMedia` only for its theme, and `@vueuse/core` is no dependency of ours, so
 * this is the one place a component asks the browser about its pointer. Input modality (hover,
 * pointer) is not width: see `docs/theory/design-system.md`.
 */
import { onScopeDispose, readonly, ref, type Ref } from 'vue';

/**
 * Whether `query` matches right now, kept current while the caller's scope lives.
 *
 * The listener is removed with the scope; a caller outside a scope (a unit test) gets no warning.
 *
 * @param query - a media query such as `(pointer: coarse)`
 * @returns a read-only ref that is true while the query matches
 */
export const useMediaQuery = (query: string): Readonly<Ref<boolean>> => {
    /**
     * The browser's `MediaQueryList` for the query: its `matches` is live, its `change` event tells.
     * https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
     */
    const list = globalThis.matchMedia(query);

    /**
     * Whether the query matches.
     */
    const matches = ref(list.matches);

    /**
     * Copies the browser's answer into the ref.
     * @param event - the `change` event
     */
    const update = (event: MediaQueryListEvent) => {
        matches.value = event.matches;
    };

    list.addEventListener('change', update);
    // Second argument `true`: do not warn when there is no active scope to hang the cleanup on.
    onScopeDispose(() => {
        list.removeEventListener('change', update);
    }, true);

    return readonly(matches);
};
