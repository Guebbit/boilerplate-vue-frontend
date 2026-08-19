import { createRouter, createWebHistory, RouterView } from 'vue-router';
import type { RouteLocationNormalized } from 'vue-router';
import { localeChoice } from '@/app/guards/locale-choice';
import { tryRestoreAuth, enforceRouteAccess } from '@/app/guards/authentications.ts';
import { getDefaultLocale } from '@/infrastructure/i18n';
import { signInLocation } from '@/app/router/navigation.ts';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';

/*
 * Every domain route in the app arrives through this one call, and this file names no domain at
 * all — which is the whole point of the registry. Enabling or dropping a domain is `src/modules.ts`
 * and its folder; nothing here changes.
 *
 * `collectModuleRoutes` validates the registry before returning anything, so a duplicate name, a
 * dependency on a module that is not enabled, or a cycle fails while the router is assembled rather
 * than on the navigation that first crosses the gap.
 */
const moduleRoutes = collectModuleRoutes(enabledModules);

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
            children: [
                {
                    path: '',
                    name: 'Home',
                    component: () => import('@/app/views/Home.vue')
                },
                /*
                 * The shop's prose pages — one component, four dictionaries. Declared by the
                 * shell rather than a module because they are about the SHOP, not a domain.
                 */
                ...(['about', 'faq', 'terms', 'privacy'] as const).map((page) => ({
                    path: page,
                    name: 'Static' + page[0].toUpperCase() + page.slice(1),
                    component: () => import('@/app/views/StaticPage.vue'),
                    props: { page }
                })),
                {
                    path: 'error/:status/:message?',
                    name: 'Error',
                    component: () => import('@/app/views/Error.vue'),
                    props: true
                },
                ...moduleRoutes,

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
 * Global navigation error handler: reports the failure and redirects somewhere meaningful instead
 * of leaving the visitor on a dead route.
 *
 * @param error - Error thrown by a guard, a lazy component import or a data fetch. A numeric
 *  `status`, when present, drives the redirect.
 * @param to - Route the failed navigation was heading for. This, not `router.currentRoute`: the
 *  navigation aborted before being committed, so `currentRoute` still points at the page being
 *  left — which sent people back where they already were after logging in.
 * @returns The `router.push` promise for the chosen redirect.
 */
router.onError((error: Error, to: RouteLocationNormalized) => {
    // Report unhandled router errors to Grafana Faro (if initialised) so they
    // are visible in the error dashboard rather than silently swallowed.
    // eslint-disable-next-line no-restricted-syntax -- an analytics/observability failure must never abort a navigation; the catch reports and lets the route proceed
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
    if (status === 401) return router.push(signInLocation(router, to.fullPath, locale));

    logger.debug('router', 'page error', error);

    // 403 gets its own copy because "you may not see this" is a different thing to tell someone
    // than whatever `error.message` holds. An absent or >=500 status collapses to a plain 500.
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
    logger.debug('router', `Navigating from ${from.path} to ${to.path}`);
    // Silently restore token + profile on every navigation so that public pages
    // (e.g. ProductsList) render the correct admin controls after a page reload.
    return tryRestoreAuth().then(() => enforceRouteAccess(to));
});

router.beforeResolve(localeChoice);

// NOTE: pageviews are tracked automatically by the Umami tracker script
// (it hooks SPA history changes), so there is no manual page_view event here.

export default router;
