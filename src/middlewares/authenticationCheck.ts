import { refreshAuthentication } from "@/api";
import { useCoreStore } from "@/stores/core";
import { useProfileStore } from '@/stores/profile';
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
        loadings
    } = useCoreStore();
    const {
        fetchAuthentication
    } = useProfileStore();

    // start loading
    loadings.authentication = true;

    // DEMO delay
    await delay(1000);

    // TODO
    loadings.authentication = false;
    next();

    // Authentication data retrieve
    // return refreshAuthentication()
    //     .then((secret) => {
    //         if(!secret)
    //             return next({
    //                 name: 'Home'
    //             });
    //         next();
    //     })
    //     .catch(({ status, statusText }: Response) => {
    //         // TODO better error: status nell'url, messaggio come parametro
    //         // if(status === 401 || status === 500)
    //         //     return next({
    //         //         name: 'Error',
    //         //         params: {
    //         //             status,
    //         //             message: statusText
    //         //         }
    //         //     });
    //         // default
    //         return next({
    //             name: 'Home'
    //         });
    //     })
    //     // end loading
    //     .finally(() => loadings.authentication = false);
}
