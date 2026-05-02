import { createRouter, createWebHistory, RouterView } from 'vue-router';
import { demoMiddleware } from '@/middlewares/demoMiddleware';
import { localeChoice } from '@/middlewares/localeChoice';
import { getDefaultLocale } from '@/utils/i18n.ts';

import accountRoutes from './accountRoutes';
import usersRoutes from './usersRoutes.ts';
import productsRoutes from './productsRoutes';
import cartRoutes from './cartRoutes.ts';
import ordersRoutes from './ordersRoutes.ts';

import HomeView from '@/views/core/Home.vue';

const isRouterDebugEnabled =
    import.meta.env.DEV && import.meta.env.VITE_APP_DEBUG_ROUTER === 'true';

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_APP_BASE_URL),
    routes: [
        {
            path: '/',
            redirect: () => ({
                name: 'Home',
                params: {
                    locale: getDefaultLocale()
                }
            })
        },
        {
            path: '/:locale',
            component: RouterView,
            beforeEnter: [demoMiddleware],
            children: [
                {
                    path: '',
                    name: 'Home',

                    component: HomeView
                },
                {
                    path: 'playground',
                    name: 'Playground',
                    component: () => import('@/views/core/Playground.vue')
                },
                ...accountRoutes,
                ...productsRoutes,
                ...usersRoutes,
                ...cartRoutes,
                ...ordersRoutes,

                {
                    path: 'error/:status/:message?',
                    name: 'Error',
                    // route level code-splitting
                    // this generates a separate chunk (About.[hash].js) for this route
                    // which is lazy-loaded when the route is visited.
                    component: () => import('@/views/core/Error.vue'),
                    props: true
                },

                /**
                 * Catch all route for all wrong routes
                 */
                {
                    path: ':catchAll(.*)',
                    redirect: {
                        name: 'Error',
                        params: {
                            status: 404,
                            message: 'error-page.not-found'
                        }
                    }
                }
            ]
        },

        /**
         * Catch if a route doesn't have the locale and assign one
         */
        {
            path: '/:catchAll(.*)',
            redirect: {
                name: 'Error',
                params: {
                    locale: getDefaultLocale(),
                    status: 404,
                    message: 'error-page.not-found'
                }
            }
        }
    ]
});

/**
 * Global error handler
 */
router.onError((error: Error) => {
    if (import.meta.env.NODE_ENV !== 'production')
        // eslint-disable-next-line no-console
        console.error('page error', error);
    return router.push({
        name: 'Error',
        params: {
            status: 500,
            message: error.message || 'error-page.unexpected'
        }
    });
});

/**
 * Global guards
 *  - beforeEach
 *  - beforeResolve
 *  - afterEach
 *
 * Order of global and per-route guards:
 *  - Global beforeEach
 *  - Per-route beforeEnter
 *  - In-component beforeRouteEnter
 *  - Global beforeResolve
 *  - Global afterEach
 *  - In-component beforeRouteUpdate (when component is reused)
 *  - In-component beforeRouteLeave
 */
router.beforeEach((to, from, next) => {
    if (isRouterDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log(`Navigating from ${from.path} to ${to.path}`);
    }
    next();
});

/**
 * Refresh (is needed) the authentication before every route
 */
// router.beforeEach((to, from, next) =>
//     refreshAuth()
//         .then(() => { next() })
// );

/**
 * Check that requeste locale is supported and loadeds
 */
router.beforeResolve(localeChoice);

export default router;
