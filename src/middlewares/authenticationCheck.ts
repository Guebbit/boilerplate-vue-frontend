import { storeToRefs } from "pinia";
import { getAuthentication } from "@/api";
import useCoreStore from "@/stores/core";
import delay from "@/utils/delay";

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
export default async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // Get global loading
    const {
        loading
    } = storeToRefs(useCoreStore());
    // start loading
    loading.value = true;
    // DEMO delay
    await delay(1000);
    // Authentication data retrive
    return getAuthentication()
        .then(({ secret }) => {
            if(!secret)
                return next({
                    name: 'Home'
                });
            next();
        })
        .catch(({ status, statusText }: Response) => {
            switch (status){
                case 401:
                    return next({
                        name: '401',
                        params: {
                            error: statusText || "Wrong credentials"
                        }
                    });
                case 500:
                    return next({
                        name: '500'
                    });
            }
            // default
            return next({
                name: 'Home'
            });
        })
        // end loading
        .finally(() => loading.value = false);
}