import { createRouter, createWebHistory, RouterView } from 'vue-router';
import { demoMiddleware } from '@/middlewares/demoMiddleware';
import { localeChoice } from '@/middlewares/localeChoice';
import { getDefaultLocale } from '@/utils/i18n.ts';
import { loginContinueTo } from '@/utils/navigation.ts';

import accountRoutes from '@/features/account/routes';
import adminRoutes from '@/features/admin/routes';
import usersRoutes from '@/features/users/routes';
import productsRoutes from '@/features/products/routes';
import cartRoutes from '@/features/cart/routes';
import ordersRoutes from '@/features/orders/routes';

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
                    component: () => import('@/views/core/Home.vue')
                },
                {
                    path: 'playground',
                    name: 'Playground',
                    component: () => import('@/views/core/Playground.vue')
                },
                {
                    path: 'error/:status/:message?',
                    name: 'Error',
                    component: () => import('@/views/core/Error.vue'),
                    props: true
                },
                ...accountRoutes,
                ...adminRoutes,
                ...productsRoutes,
                ...usersRoutes,
                ...cartRoutes,
                ...ordersRoutes,

                {
                    path: ':catchAll(.*)',
                    redirect: (to) => ({
                        name: 'Error',
                        params: {
                            locale: to.params.locale as string,
                            status: 404,
                            message: 'error-page.not-found'
                        }
                    })
                }
            ]
        },

        {
            path: '/:catchAll(.*)',
            redirect: () => ({
                name: 'Error',
                params: {
                    locale: getDefaultLocale(),
                    status: 404,
                    message: 'error-page.not-found'
                }
            })
        }
    ]
});

router.onError((error: Error) => {
    const currentRoute = router.currentRoute.value;
    const locale =
        typeof currentRoute.params.locale === 'string'
            ? currentRoute.params.locale
            : getDefaultLocale();
    const status =
        typeof (error as { status?: unknown }).status === 'number'
            ? ((error as { status?: number }).status ?? 500)
            : undefined;

    if (status === 401) return router.push(loginContinueTo(currentRoute.fullPath, locale));

    if (status === 403)
        return router.push({
            name: 'Error',
            params: {
                locale,
                status: 403,
                message: 'navigation.error-forbidden'
            }
        });

    if (import.meta.env.DEV && import.meta.env.VITE_APP_DEBUG_ROUTER === 'true')
        // eslint-disable-next-line no-console
        console.error('page error', error);

    if (status && status < 500)
        return router.push({
            name: 'Error',
            params: {
                locale,
                status,
                message: error.message || 'error-page.unexpected'
            }
        });

    return router.push({
        name: 'Error',
        params: {
            locale,
            status: 500,
            message: error.message || 'error-page.unexpected'
        }
    });
});

router.beforeEach((to, from, next) => {
    if (isRouterDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log(`Navigating from ${from.path} to ${to.path}`);
    }
    next();
});

router.beforeResolve(localeChoice);

export default router;
