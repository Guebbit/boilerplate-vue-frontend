import { useProfileStore } from '@/stores/profile';

import type {
    NavigationGuardNext,
    RouteLocationNormalized,
} from "vue-router";
import { storeToRefs } from 'pinia'

/**
 * DUMMY authentication, will run in global guards (in the router object)
 * WARNING: CAN'T USE injected variables, because guards DON'T have access to the scope, they are not part of the "tree".
 *
 * @param to
 * @param from
 * @param next
 */
export const isAuth = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    const {
        isAuth,
    } = storeToRefs(useProfileStore());

    const {
        refreshToken,
    } = useProfileStore();

    /**
     * If already authenticated, skip
     */
    if(isAuth.value){
        next();
        return;
    }

    /**
     * If not authenticated,
     * try to refresh the token
     */
    return refreshToken()
        .then(() => {
            //redo the check
            if(isAuth.value)
                next();
        })
        .finally(() => {
            // Not authenticated, return to login
            next({
                name: 'Login',
                params: {
                    continue: to
                }
            })
        })
}
