/**
 * @module
 * The app's router. Locale-prefixed routes, with every domain route contributed by enabled
 * modules through the kernel registry — this file names no domain. Guards restore the session,
 * enforce `meta.access` and sync the i18n locale; `afterEach` sets the tab title, the a11y
 * announcement and focus.
 */
import { nextTick } from 'vue';
import { createRouter, createWebHistory, RouterView, START_LOCATION } from 'vue-router';
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { localeChoice } from '@/app/guards/locale-choice';
import { tryRestoreAuth, enforceRouteAccess } from '@/app/guards/authentications.ts';
import { getDefaultLocale, translate } from '@/i18n';
import { oauthCallbackLocation } from '@/app/router/oauth-callback.ts';
import { signInLocation } from '@/app/router/navigation.ts';
import { announceRouteChange, requestMainFocus, consumeMainFocus } from '@/app/router/announcer.ts';
import { registerStaleDeployRecovery, recoverFromStaleDeploy } from '@/app/router/stale-deploy.ts';
import { GENERIC_ERROR_KEY, isKnownErrorMessage } from '@/app/utils/error-messages.ts';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

import { assertUniqueRoutes, collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { staticPageRouteName } from '@/app/utils/static-pages.ts';
import { brandName } from '@/app/utils/branding.ts';

/*
 * Every domain route in the app arrives through this one call, and this file names no domain at
 * all — which is the whole point of the registry. Enabling or dropping a domain is `src/modules.ts`
 * and its folder; nothing here changes.
 *
 * A module reaching a sibling it has no coupling rule for is checked by `eslint.config.ts`'s
 * generated `moduleCouplingRules`, so a misconfigured coupling fails on `npm run lint` rather than
 * here. `collectModuleRoutes` itself refuses two modules sharing a name or path (FA72); the check
 * below widens that to the shell's own routes, right before the router is built from both.
 */
const moduleRoutes = collectModuleRoutes(enabledModules);

/**
 * The shop's own routes under `/:locale` — Home, the four prose pages, and the Error shell —
 * named separately from `moduleRoutes` so {@link assertUniqueRoutes} can check both against each
 * other below, and shared with `router.spec.ts`'s "app + module" duplicate-route cases.
 */
const shellChildRoutes: RouteRecordRaw[] = [
    {
        path: '',
        name: 'Home',
        meta: { title: 'home-page.page-title' },
        component: () => import('@/app/views/Home.vue')
    },
    /*
     * The shop's prose pages, one component each — every word comes from the dictionary, the
     * structure (feature grid, FAQ topics, legal clauses) from the component. Declared by the
     * shell rather than a module because they are about the SHOP, not a domain.
     */
    {
        path: 'about',
        name: staticPageRouteName('about'),
        meta: { title: 'static-pages.about.title' },
        component: () => import('@/app/views/AboutPage.vue')
    },
    {
        path: 'faq',
        name: staticPageRouteName('faq'),
        meta: { title: 'static-pages.faq.title' },
        component: () => import('@/app/views/FaqPage.vue')
    },
    {
        path: 'terms',
        name: staticPageRouteName('terms'),
        meta: { title: 'static-pages.terms.title' },
        component: () => import('@/app/views/TermsPage.vue')
    },
    {
        path: 'privacy',
        name: staticPageRouteName('privacy'),
        meta: { title: 'static-pages.privacy.title' },
        component: () => import('@/app/views/PrivacyPage.vue')
    },
    {
        path: 'error/:status/:message?',
        name: 'Error',
        // `customHero`: the title carries the HTTP-like status beside it, richer than a plain
        // translated key — `Error.vue` renders its own `PageHeader`. `centered`: a full-height
        // centered empty state, not the ordinary left-aligned page flow.
        meta: { title: 'error-page.page-title', customHero: true, centered: true },
        component: () => import('@/app/views/Error.vue'),
        props: true
    }
];

// Runs at import time, before `createRouter` below: a module colliding with a sibling OR with one
// of the shell's own names/paths must fail the build rather than silently losing a route.
assertUniqueRoutes([...shellChildRoutes, ...moduleRoutes]);

/**
 * The name that follows every page title in the browser tab, and stands alone on a route that
 * declares none. An env value so a derived project renames the tab without touching the router.
 */
const appName = brandName();

/**
 * Whether the visitor asked the OS for less motion; read per call, since the setting can change.
 */
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The application's router: locale-prefixed routes, module-contributed routes merged in via
 * the kernel registry, plus the top-level 404/redirect shells the shell owns itself.
 */
const router = createRouter({
    // Vite's own BASE_URL, derived from `vite.config.ts`'s `base` — never `VITE_APP_BASE_URL`
    // directly, which vue-router would treat as a full origin, not a path.
    history: createWebHistory(import.meta.env.BASE_URL),
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
        /*
         * The backend's OAuth callback redirects here (`NODE_FRONTEND_URL` carries no locale
         * segment — it names an origin, not a page) — so this is the one entry point into the app
         * that has to exist outside `/:locale`, same reasoning as the `/` redirect above. `query`
         * is carried through so `?error=<code>` survives into `OAuthCallback.vue`, and `?locale=` picks
         * the language the visitor started the login in (`oauth-callback.ts`).
         */
        {
            path: '/oauth/callback',
            redirect: (to) => oauthCallbackLocation(to.query)
        },
        {
            path: '/:locale',
            component: RouterView,
            children: [
                {
                    // Empty path: matches `/:locale` exactly, adding nothing of its own — the
                    // nested-layout pattern vue-router itself documents. `LayoutDefault` becomes
                    // the actual rendered component for every real page (FA70), mounted once
                    // rather than by each view individually, with its OWN `<RouterView />` for
                    // whichever child below actually matched. Lazy, same as every route below it:
                    // it pulls in the nav, both banners and the dialog hosts, and an eager import
                    // here would put all of that in the entry chunk instead of a route chunk
                    // (FA94's own budget, `entry-chunk-budget.spec.ts`).
                    path: '',
                    component: () => import('@/app/layouts/LayoutDefault.vue'),
                    children: [
                        ...shellChildRoutes,
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
// Vite: registered once, at module load, so it is armed before the very first lazy route import
// can fail. See `stale-deploy.ts` for why the actual reload happens in `onError` below instead.
registerStaleDeployRecovery(globalThis);

router.onError((error: Error, to: RouteLocationNormalized) => {
    // Report unhandled router errors to Grafana Faro (if initialised) so they
    // are visible in the error dashboard rather than silently swallowed.
    // eslint-disable-next-line no-restricted-syntax -- an analytics/observability failure must never abort a navigation; the catch reports and lets the route proceed
    try {
        useObservabilityStore().captureException(error);
    } catch {
        // Store may not be initialised yet in edge cases — ignore.
    }

    // A stale chunk from a deploy that has since moved on: reload once, to the SAME target, and
    // stop here — an open tab should recover silently rather than show an error a fresh load
    // would not have hit at all.
    if (recoverFromStaleDeploy(to.fullPath, (url) => location.assign(url), sessionStorage))
        return Promise.resolve();

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

    // Only a message THIS app's own dictionary owns reaches the page, the URL and Umami's
    // pageview — anything else (a caught fetch failure's text, a stale chunk's own URL) folds
    // into the generic key instead of leaking verbatim (FA74).
    const message =
        status === 403
            ? 'navigation.error-forbidden'
            : error.message && isKnownErrorMessage(error.message)
              ? error.message
              : GENERIC_ERROR_KEY;

    return router.push({
        name: 'Error',
        params: {
            locale,
            status: isClientError ? status : 500,
            message
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
    return tryRestoreAuth().then(() => enforceRouteAccess(to, router));
});

/**
 * Registered as `beforeResolve`, not `beforeEach`: it must run after `enforceRouteAccess` has
 * decided whether the navigation proceeds at all, so a blocked visitor never pays for a dictionary
 * load that the `beforeEach` guard above is about to discard.
 */
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
 * A failed navigation (aborted, cancelled, or a duplicate of the current route) returns early:
 * `to` was never actually reached, so writing its title over the page the visitor is still on
 * would be wrong regardless of whether the two titles happen to match.
 *
 * @param to - Route that has just been entered.
 * @param from - Route that was left; `START_LOCATION` on the initial load.
 * @param failure - Set when the navigation did not actually land on `to`.
 */
router.afterEach((to, from, failure) => {
    if (failure) return;

    const title = to.meta.title ? translate(to.meta.title) : '';
    document.title = title ? `${title} — ${appName}` : appName;
    void announceRouteChange(title);

    const isPageChange = from !== START_LOCATION && to.path !== from.path && !to.hash;
    if (!isPageChange) return;

    // `LayoutDefault` mounts once for the whole session (FA70), not per view, so its own
    // `onMounted` can no longer consume this — this is the SOLE place that does, on every page
    // change. The tick waits for the new page's own content to actually be in the DOM first.
    requestMainFocus();
    void nextTick(consumeMainFocus);
});

// NOTE: pageviews are tracked automatically by the Umami tracker script
// (it hooks SPA history changes), so there is no manual page_view event here.

export default router;
