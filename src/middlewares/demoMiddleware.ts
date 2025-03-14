import { storeToRefs } from "pinia";
import { i18n } from "@/utils/i18n.ts";
import { useCounterStore } from "@/stores/counter";

import type {
    NavigationGuardNext,
    RouteLocationNormalized,
} from "vue-router";

/**
 * DUMMY authentication, will run in global guards (in the router object)
 * WARNING: CAN'T USE injected variables, because guards DON'T have access to the scope, they are not part of the "tree".
 *
 * @param to
 * @param from
 * @param next
 */
export const demoMiddleware = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    /**
     * Can use the store
     */
    const store = useCounterStore();
    const {
        count,
    } = storeToRefs(store);
    count.value++;
    // eslint-disable-next-line no-console
    console.log("count++: " + count.value);

    /**
     * Can use translations, but it could happen before they are loaded correctly
     * (like in this case, where it is loaded in a route guard, before App.vue)
     */
    const { t, locale } = i18n.global;
    // eslint-disable-next-line no-console
    console.log("locale (will not work): " + locale.value, t('generic.loading', { load: to.path }));

    next();
};