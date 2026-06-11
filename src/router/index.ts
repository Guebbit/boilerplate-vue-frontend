import { createRouter, createWebHistory, RouterView } from 'vue-router';
import { demoMiddleware } from '@/middlewares/demoMiddleware';
import { localeChoice } from '@/middlewares/localeChoice';
import { tryRestoreAuth } from '@/middlewares/authentications.ts';
import { getDefaultLocale } from '@/utils/i18n.ts';
import { loginContinueTo } from '@/utils/navigation.ts';
import { track, AnalyticsEvents } from '@/plugins/observability';

import accountRoutes from '@/features/account/routes';
import adminRoutes from '@/features/admin/routes';
import usersRoutes from '@/features/users/routes';
import productsRoutes from '@/features/products/routes';
import realtimeRoutes from '@/features/realtime/routes';
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
                    component: () => import('@/views/Home.vue')
                },
                {
                    path: 'playground',
                    name: 'Playground',
                    component: () => import('@/views/Playground.vue')
                },
                {
                    path: 'error/:status/:message?',
                    name: 'Error',
                    component: () => import('@/views/Error.vue'),
                    props: true
                },
                ...accountRoutes,
                ...adminRoutes,
                ...productsRoutes,
                ...realtimeRoutes,
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

router.beforeEach((to, from) => {
    if (isRouterDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log(`Navigating from ${from.path} to ${to.path}`);
    }
    // Silently restore token + profile on every navigation so that public pages
    // (e.g. ProductsList) render the correct admin controls after a page reload.
    return tryRestoreAuth();
});

router.beforeResolve(localeChoice);

// Track page views for analytics
router.afterEach((to) => {
  track(AnalyticsEvents.PAGE_VIEW, {
    path: to.path,
    name: to.name as string,
    params: to.params as Record<string, unknown>,
    query: to.query as Record<string, unknown>
  });
});

export default router;
