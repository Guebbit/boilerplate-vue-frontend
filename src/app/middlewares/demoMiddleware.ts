import { storeToRefs } from 'pinia';
import { i18n } from '@/infrastructure/i18n.ts';
import { useCounterStore } from '@/app/counter';

import type { RouteLocationNormalized } from 'vue-router';
import { logger } from '@/infrastructure/logger.ts';

/**
 * DUMMY guard showing what is (and isn't) reachable from a global route guard.
 *
 * Demonstrates that Pinia stores work anywhere, while translations may not be
 * loaded yet this early in the navigation.
 *
 * WARNING: CAN'T USE injected variables, because guards DON'T have access to
 * the component scope, they are not part of the "tree".
 *
 * Returns nothing (rather than calling a `next()` callback) to let the navigation through: the
 * callback style is deprecated in Vue Router 4 and warns on every hit.
 *
 * @param to - Route being entered; its path is fed to a demo translation.
 */
export const demoMiddleware = (to: RouteLocationNormalized) => {
    /**
     * Can use the store
     */
    const { count } = storeToRefs(useCounterStore());
    count.value++;
    logger.debug('demo', 'count++: ' + count.value);

    /**
     * Can use translations, but it could happen before they are loaded correctly
     * (like in this case, where it is loaded in a route guard, before App.vue)
     */
    const { t, locale } = i18n.global;
    logger.debug(
        'demo',
        'locale (will not work): ' + locale.value,
        t('generic.loading', { load: to.path })
    );
};
