/**
 * @module
 * A Vue Router `beforeEnter` guard, scoped to the edit route. It teaches what is, and is not,
 * reachable from a guard: a Pinia store works anywhere, translations may not be loaded yet.
 */
import { useExampleStore } from '@/modules/example/store.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

import type { RouteLocationNormalized } from 'vue-router';

/**
 * Loads the example the edit screen is about before the screen mounts, so the form opens already
 * filled instead of flashing empty.
 *
 * What a guard can reach:
 * - a Pinia store: yes, it works anywhere (this one reads and fills one);
 * - translations: not yet. The locale dictionary loads in `beforeResolve`, which runs AFTER every
 *   `beforeEnter`, so `t()` here would return the raw key. That is why this guard says nothing to
 *   the visitor and leaves the wording to the view;
 * - injected variables: never. A guard has no component scope.
 *
 * A failed load is not this guard's to report: the view asks the same store and shows the
 * not-found page itself. So it always lets the navigation through, by returning nothing. Vue
 * Router treats ANY returned value as a navigation instruction (`false` would block every edit),
 * and the callback style is deprecated.
 *
 * @param to - The route being entered; its `id` param names the example to load.
 */
export const exampleEditGuard = (to: RouteLocationNormalized): Promise<void> => {
    const id = typeof to.params.id === 'string' ? to.params.id : undefined;
    if (!id) return Promise.resolve();

    logger.debug('example', 'loading before the edit screen: ' + id);
    return useExampleStore()
        .fetchExample(id)
        .then(() => undefined)
        .catch(() => undefined);
};
