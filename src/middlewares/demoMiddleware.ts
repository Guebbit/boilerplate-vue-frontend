import { storeToRefs } from 'pinia';
import { i18n } from '@/utils/i18n.ts';
import { useCounterStore } from '@/stores/counter';

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

/**
 * DUMMY guard showing what is (and isn't) reachable from a global route guard.
 *
 * Demonstrates that Pinia stores work anywhere, while translations may not be
 * loaded yet this early in the navigation.
 *
 * WARNING: CAN'T USE injected variables, because guards DON'T have access to
 * the component scope, they are not part of the "tree".
 *
 * @param to - Route being entered; its path is fed to a demo translation.
 * @param from - Route being left (unused, kept for the guard signature).
 * @param next - Navigation callback, always called to let the route through.
 */
export const demoMiddleware = (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
) => {
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

    next();
};
