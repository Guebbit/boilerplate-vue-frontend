import { nextTick } from 'vue';
import { createRouter, createWebHistory, RouterView, START_LOCATION } from 'vue-router';
import type { RouteLocationNormalized } from 'vue-router';
import { localeChoice } from '@/app/guards/locale-choice';
import { tryRestoreAuth, enforceRouteAccess } from '@/app/guards/authentications.ts';
import { getDefaultLocale, translate } from '@/infrastructure/i18n';
import { signInLocation } from '@/app/router/navigation.ts';
import { routeAnnouncement, requestMainFocus, consumeMainFocus } from '@/app/router/announcer.ts';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';

/*
 * Every domain route in the app arrives through this one call, and this file names no domain at
 * all — which is the whole point of the registry. Enabling or dropping a domain is `src/modules.ts`
 * and its folder; nothing here changes.
 *
 * A module reaching a sibling it has no coupling rule for is checked by `eslint.config.ts`'s
 * generated `moduleCouplingRules`, so a misconfigured coupling fails on `npm run lint` rather than
 * here.
 */
const moduleRoutes = collectModuleRoutes(enabledModules);

/**
 * The name that follows every page title in the browser tab, and stands alone on a route that
 * declares none. An env value so a derived project renames the tab without touching the router.
 */
const appName = (import.meta.env.VITE_APP_NAME as string | undefined) || 'Guebbit';

/** Whether the visitor asked the OS for less motion; read per call, since the setting can change. */
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_APP_BASE_URL),
    /**
     * Back/forward restore where the visitor was; a new page starts at the top, or at its anchor.
     *
     * A navigation that only changes the query — a list page re-searching — keeps its position:
     * jumping to the top on every filter change would throw the visitor off the control they just
     * used. Smooth only when the OS has not asked for reduced motion (WCAG 2.3.3).
     *
     * @param to - Route being entered.
     * @param from - Route being left.
     * @param savedPosition - Where the visitor was, on a history navigation; `null` otherwise.
     * @returns The scroll target, or `false` to leave the viewport alone.
     */
    scrollBehavior: (to, from, savedPosition) => {
        const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
        if (savedPosition) return { ...savedPosition, behavior };
        if (to.hash) return { el: to.hash, behavior };
        if (to.path === from.path) return false;
        return { top: 0, behavior };
    },
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
                    meta: { title: 'home-page.page-title' },
                    component: () => import('@/app/views/Home.vue')
                },
                /*
                 * The shop's prose pages — one component, four dictionaries. Declared by the
                 * shell rather than a module because they are about the SHOP, not a domain.
                 */
                ...(['about', 'faq', 'terms', 'privacy'] as const).map((page) => ({
                    path: page,
                    name: 'Static' + page[0].toUpperCase() + page.slice(1),
                    meta: { title: `static-pages.${page}.title` },
                    component: () => import('@/app/views/StaticPage.vue'),
                    props: { page }
                })),
                {
                    path: 'error/:status/:message?',
                    name: 'Error',
                    meta: { title: 'error-page.page-title' },
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
        useObservabilityStore().captureException(error);
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

/**
 * After every navigation: the tab title, the announcement, and where focus goes.
 *
 * Registered AFTER `localeChoice`, and that order is load-bearing: `translate` reads the active
 * dictionary, and the guard is what loads it. Resolved here, once, rather than in each view —
 * a view that forgot would leave the previous page's title in the tab (WCAG 2.4.2).
 *
 * Focus moves to `<v-main>` on a real page change only. The initial load already starts at the
 * top, and a navigation to an anchor must leave focus alone so the anchor wins; a query-only
 * change (a list re-searching) keeps focus on the control that caused it (WCAG 2.4.3).
 *
 * @param to - Route that has just been entered.
 * @param from - Route that was left; `START_LOCATION` on the initial load.
 */
router.afterEach((to, from) => {
    const title = to.meta.title ? translate(to.meta.title) : '';
    document.title = title ? `${title} — ${appName}` : appName;
    routeAnnouncement.value = title;

    const isPageChange = from !== START_LOCATION && to.path !== from.path && !to.hash;
    if (!isPageChange) return;

    // The new view mounts its own layout, and that layout consumes the request on mount. The
    // tick below covers the other case — a navigation that kept the same view (detail → detail),
    // where nothing remounts and nobody else would consume it.
    requestMainFocus();
    void nextTick(consumeMainFocus);
});

// NOTE: pageviews are tracked automatically by the Umami tracker script
// (it hooks SPA history changes), so there is no manual page_view event here.

export default router;
