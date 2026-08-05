import { storeToRefs } from 'pinia';
import { i18n } from '@/utils/i18n.ts';
import { useCounterStore } from '@/stores/counter';

import type { RouteLocationNormalized } from 'vue-router';

/**
 * DUMMY guard showing what is (and isn't) reachable from a global route guard.
 *
 * Demonstrates that Pinia stores work anywhere, while translations may not be
 * loaded yet this early in the navigation.
 *
 * WARNING: CAN'T USE injected variables, because guards DON'T have access to
 * the component scope, they are not part of the "tree".
 *
 * Returns nothing (rather than calling a `next()` callback) to let the navigation through — the
 * callback style is deprecated in Vue Router 4 and, since this guard runs on every navigation,
 * logged its warning on every single route change.
 *
 * @param to - Route being entered; its path is fed to a demo translation.
 */
export const demoMiddleware = (to: RouteLocationNormalized) => {
    /**
     * Can use the store
     */
    const { count } = storeToRefs(useCounterStore());
    count.value++;
    // eslint-disable-next-line no-console
    console.log('count++: ' + count.value);

    /**
     * Can use translations, but it could happen before they are loaded correctly
     * (like in this case, where it is loaded in a route guard, before App.vue)
     */
    const { t, locale } = i18n.global;
    // eslint-disable-next-line no-console
    console.log('locale (will not work): ' + locale.value, t('generic.loading', { load: to.path }));
};
