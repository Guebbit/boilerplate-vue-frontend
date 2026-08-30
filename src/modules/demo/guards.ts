/**
 * @module
 * Vue Router `beforeEnter` guard, scoped to the Playground route. Reads a
 * Pinia store and calls `i18n.global.t` directly to demonstrate what is (and
 * isn't) reachable this early in navigation.
 */
import { storeToRefs } from 'pinia';
import { i18n } from '@/infrastructure/i18n';
import { logger } from '@/infrastructure/utils/logger.ts';
import { useDemoStore } from '@/modules/demo/store.ts';

import type { RouteLocationNormalized } from 'vue-router';

/**
 * DUMMY guard showing what is (and isn't) reachable from a route guard.
 *
 * Pinia stores work anywhere; translations may not be loaded this early in a navigation. Injected
 * variables are NOT available — a guard has no component scope.
 *
 * Returns nothing (rather than calling `next()`) to let the navigation through: the callback style
 * is deprecated in Vue Router 4 and warns on every hit.
 *
 * @param to - Route being entered; its path is fed to a demo translation.
 */
export const exampleGuard = (to: RouteLocationNormalized) => {
    const { count } = storeToRefs(useDemoStore());
    count.value++;
    logger.debug('demo', 'count++: ' + count.value);

    // `localeChoice` loads the dictionary in `beforeResolve`, which runs AFTER every
    // `beforeEnter` — so at this point there are no messages and `t()` returns the raw key.
    const { t, locale } = i18n.global;
    logger.debug(
        'demo',
        'locale (will not work): ' + locale.value,
        t('generic.loading', { load: to.path })
    );
};
