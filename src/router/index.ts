import { createRouter, createWebHistory, RouterView } from 'vue-router';
import type { RouteLocationNormalized } from 'vue-router';
import { demoMiddleware } from '@/middlewares/demoMiddleware';
import { localeChoice } from '@/middlewares/localeChoice';
import { tryRestoreAuth, enforceRouteAccess } from '@/middlewares/authentications.ts';
import { getDefaultLocale } from '@/utils/i18n.ts';
import { loginContinueTo } from '@/router/navigation.ts';
import { useObservabilityStore } from '@/stores/observability';

import accountRoutes from '@/features/account/routes';
import adminRoutes from '@/features/admin/routes';
import usersRoutes from '@/features/users/routes';
import productsRoutes from '@/features/products/routes';
import realtimeRoutes from '@/features/realtime/routes';
import cartRoutes from '@/features/cart/routes';
import ordersRoutes from '@/features/orders/routes';

/**
 * Whether navigation logging is on: dev builds with `VITE_APP_DEBUG_ROUTER`.
 */
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

/**
 * Read a route's `:locale` param, or undefined when it has none.
 *
 * `params` values are `string | string[]`, so a repeated param would otherwise flow into a URL
 * as a comma-joined string.
 */
const readLocaleParameter = ({ params }: RouteLocationNormalized): string | undefined =>
    typeof params.locale === 'string' ? params.locale : undefined;

/**
 * Global navigation error handler: reports the failure and redirects to a
 * meaningful page instead of leaving the user on a dead route.
 *
 * @param error - Error thrown by a guard, a lazy component import or a data
 *  fetch. A numeric `status` property, when present, drives the redirect:
 *  401 goes to login (keeping the target path), 403 and other <500 statuses go
 *  to the error page with that status, anything else becomes a 500.
 * @param to - Route the failed navigation was heading for. This, not
 *  `router.currentRoute`, is the target: the navigation aborted before being
 *  committed, so `currentRoute` still points at the page the user was leaving —
 *  which sent them back where they already were after logging in.
 * @returns The `router.push` promise for the chosen redirect.
 */
router.onError((error: Error, to: RouteLocationNormalized) => {
    // Report unhandled router errors to Grafana Faro (if initialised) so they
    // are visible in the error dashboard rather than silently swallowed.
    try {
        const obs = useObservabilityStore();
        obs.captureException(error);
    } catch {
        // Store may not be initialised yet in edge cases — ignore.
    }

    // The aborted target first, then the route being left, then the default. The second step
    // matters when the failure came from a route that carries no `:locale` param of its own.
    const locale =
        readLocaleParameter(to) ??
        readLocaleParameter(router.currentRoute.value) ??
        getDefaultLocale();
    const status =
        typeof (error as { status?: unknown }).status === 'number'
            ? ((error as { status?: number }).status ?? 500)
            : undefined;

    // 401 is the one recoverable status: logging in fixes it, so keep where they were going.
    if (status === 401) return router.push(loginContinueTo(to.fullPath, locale));

    if (isRouterDebugEnabled)
        // eslint-disable-next-line no-console
        console.error('page error', error);

    /*
     * Everything else is the error page, which needs only a status and a message key.
     *
     * 403 gets its own copy because "you may not see this" is a different thing to tell someone
     * than whatever `error.message` happens to hold; every other client status shows the error's
     * own message, and an absent or >=500 status collapses to a plain 500 — a failure with no
     * status is a server-side one as far as the visitor is concerned.
     */
    const isClientError = status !== undefined && status < 500;

    return router.push({
        name: 'Error',
        params: {
            locale,
            status: isClientError ? status : 500,
            message:
                status === 403
                    ? 'navigation.error-forbidden'
                    : error.message || 'error-page.unexpected'
        }
    });
});

/**
 * Runs before every navigation: optional debug logging, a silent auth restore, then the route's
 * own access requirement.
 *
 * The order is load-bearing. `tryRestoreAuth` must settle first, so that `enforceRouteAccess`
 * reads a profile that has been restored rather than bouncing a legitimately authenticated
 * visitor who has just reloaded the page. Restoring once here — rather than inside each guard —
 * is also what stops every protected navigation refetching the profile.
 *
 * @param to - Route being entered.
 * @param from - Route being left.
 * @returns A navigation verdict: `undefined` to proceed, or the location to redirect to.
 */
router.beforeEach((to, from) => {
    if (isRouterDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log(`Navigating from ${from.path} to ${to.path}`);
    }
    // Silently restore token + profile on every navigation so that public pages
    // (e.g. ProductsList) render the correct admin controls after a page reload.
    return tryRestoreAuth().then(() => enforceRouteAccess(to));
});

router.beforeResolve(localeChoice);

// NOTE: pageviews are tracked automatically by the Umami tracker script
// (it hooks SPA history changes), so there is no manual page_view event here.

export default router;
