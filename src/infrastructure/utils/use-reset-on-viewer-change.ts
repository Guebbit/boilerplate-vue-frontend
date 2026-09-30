/**
 * @module
 * Keeps a store that holds ONE PERSON'S data from outliving that person's session.
 *
 * Pinia stores live as long as the tab does. A cart or a wishlist loaded for one visitor would
 * otherwise still be in memory when the next one signs in on the same tab, and show through until
 * a refetch lands. The hook watches who the viewer is and calls the store's own reset when the
 * person changes or leaves: a logout here, a logout in another tab (which clears the viewer the
 * same way), or a different account taking over.
 */
import { watch } from 'vue';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * Calls `reset` whenever the signed-in person stops being the one the store was filled for.
 *
 * Nothing runs for the first sign-in (no one was there before) and nothing for a refresh of the
 * same person's record: only a change of id that had a previous id.
 *
 * @param reset - Empties the store's per-person state.
 */
export const useResetOnViewerChange = (reset: () => void): void => {
    const session = useSessionStore();
    // Vue `watch`: a getter source, so it fires on the id alone, not on every field of the viewer.
    // https://vuejs.org/api/reactivity-core.html#watch
    watch(
        () => session.viewer?.id,
        (_current, previous) => {
            if (previous !== undefined) reset();
        }
    );
};
