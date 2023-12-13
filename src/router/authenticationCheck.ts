import { getAuthentication } from "@/api";
import delay from "@/utils/delay";

import type {
    NavigationGuardNext,
    RouteLocationNormalized,
} from "vue-router";

/**
 * DUMMY authentication
 *
 * @param to
 * @param from
 * @param next
 */
export default async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    await delay(0);
    return getAuthentication()
        .then(({ id }) => {
            if(!id){
                next({
                    name: 'Home'
                });
                return;
            }
            next();
        })
        .catch(({ status, statusText }: Response) => {
            switch (status){
                case 401: {
                    next({
                        name: '401',
                        params: {
                            error: "Wrong credentials"
                        }
                    })
                    return;
                }
                case 500: {
                    next({
                        name: '500'
                    })
                    return;
                }
            }
            // default
            next({
                name: 'Home'
            });
        });
}