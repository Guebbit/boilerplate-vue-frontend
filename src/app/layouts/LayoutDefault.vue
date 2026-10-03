<script setup lang="ts">
/**
 * @module
 * The one page shell the router mounts once, for every route under `/:locale` — skip link,
 * health banner, nav, page hero, footer, confirmation dialog host, toast stack and loading
 * indicators, with `<RouterView />` in the middle for whichever page actually matched. Preloads
 * nothing domain-specific — see the note near the end of this block.
 *
 * Being mounted once, not per view, is what moved the focus handoff out of here: `onMounted`
 * would now fire only on the very first navigation, never again. `router/index.ts`'s `afterEach`
 * is the sole place that still runs it, on every page change.
 */
import { computed, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useLocale } from 'vuetify';
import { localeDirections } from '@/i18n';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { STATIC_PAGES, staticPageRouteName } from '@/app/utils/static-pages.ts';
import AppNavigation from '@/app/components/AppNavigation.vue';
import AppHealthBanner from '@/app/components/AppHealthBanner.vue';
import AppVerificationBanner from '@/app/components/AppVerificationBanner.vue';
import AppAnalyticsConsentBanner from '@/app/components/AppAnalyticsConsentBanner.vue';
import {
    isAnalyticsConsentEnabled,
    useAnalyticsConsentStore
} from '@/infrastructure/analytics-consent.ts';
import DialogHost from '@/ui/organisms/DialogHost.vue';
import ReauthDialog from '@/app/components/ReauthDialog.vue';
import PageHeader from '@/ui/molecules/PageHeader.vue';
import { useCoreStore, useIsLoading, useNotificationsStore } from '@guebbit/vue-toolkit';
import { MAIN_CONTENT } from '@/app/router/announcer.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { collectModuleLoadingKeys } from '@/kernel/registry';
import { enabledModules } from '@/modules';

/**
 * The active route, read for `meta.title`/`meta.customHero`/`meta.centered` — the three things a
 * view used to pass this layout as props, now that there is no view-to-layout slot or prop to
 * pass them through at all.
 */
const route = useRoute();

/**
 * Translation function and the active locale, the latter watched below to keep Vuetify in sync.
 */
const { t, locale } = useI18n();

/**
 * The hero's own title, translated from the matched route's own `meta.title` — absent on the
 * redirect shells that never render a page, and on a route that opted out entirely
 * (see `customHero` below).
 */
const heroTitle = computed(() => (route.meta.title ? t(route.meta.title) : ''));

/**
 * Whether this route renders its own hero (a dynamic title, or richer markup) instead of the
 * generic one below — `RouteMeta.customHero`.
 */
const customHero = computed(() => route.meta.customHero === true);

/**
 * Whether this route's content column centers instead of the ordinary left-aligned flow —
 * `RouteMeta.centered`, `Error.vue`'s own case.
 */
const centered = computed(() => route.meta.centered === true);

/**
 * The skip link, by hand: a bare `href` is a hash navigation to the router, which
 * does not move focus — and focus is the whole point of the link.
 */
const skipToContent = () =>
    document.querySelector<HTMLElement>(MAIN_CONTENT)?.focus({ preventScroll: false });

/**
 * Keep Vuetify's internal strings (data-table, pagination, aria-labels…)
 * in sync with the app locale.
 *
 * Explicitly `en` for a language Vuetify has no messages for — a locale the API added at runtime,
 * say. Vuetify does fall back on its own, but only per key and with a console warning for each,
 * and pointing `current` at a locale it does not know leaves its `aria-label`s half-resolved.
 * Saying so here keeps the fallback a decision rather than a side effect.
 */
const { current: vuetifyLocale, messages: vuetifyMessages, rtl: vuetifyRtl } = useLocale();

/**
 * Applies the fallback rule above whenever the app locale changes, and once immediately
 * on mount so the very first render is already in sync.
 *
 * Also tells Vuetify's own components (text alignment, icon mirroring, `VNavigationDrawer`'s
 * side…) which way the new locale reads. `<html dir>` alone only affects plain CSS; Vuetify reads
 * its OWN `rtl` map instead, and it is empty until this fills it in. `localeDirections` only has
 * an entry once the manifest has been fetched — a right-to-left language is `ltr` here until then,
 * same as {@link applyHtmlLocaleAttributes} in `@/i18n` already assumes.
 */
watch(
    locale,
    (newLocale) => {
        vuetifyLocale.value = newLocale in vuetifyMessages.value ? newLocale : 'en';
        vuetifyRtl.value = {
            ...vuetifyRtl.value,
            [newLocale]: localeDirections[newLocale] === 'rtl'
        };
    },
    { immediate: true } // run the callback once on mount, not just on future changes
);

/**
 * The shop's prose pages, cross-linked from the footer so a `contentinfo` landmark exists on every
 * page. Same four the router declares; the names are computed the same way.
 */
const legalLinks = STATIC_PAGES.map((page) => ({
    page,
    to: routerLinkI18n({ name: staticPageRouteName(page) })
}));

/**
 * Loading keys the full-page overlay answers to — the one thing allowed to block the whole
 * screen. No module sets `core` by default; one that must block the whole screen sets it by hand
 * with `setLoading('core', …)`. App bootstrap has its own, necessarily earlier, cover —
 * `index.html`'s static splash, shown before Vue (and this layout) exists at all to render an
 * overlay.
 */
const MAIN_LOADING_KEYS = ['core'];

/**
 * Loading keys the discreet corner indicator answers to — each enabled module's own `loadingKeys`
 * prefixes. A key nobody declares is deliberately invisible: opting in is what separates "the app
 * is doing something the visitor asked for" from "a request exists".
 */
const SIDE_LOADING_KEYS = collectModuleLoadingKeys(enabledModules);

/**
 * Reads `core`'s own manual flag — a hand-set one, so this stays on `useCoreStore` rather than
 * the shared `QueryClient` below.
 */
const { isLoading } = useCoreStore();

/**
 * Whether the app is still booting — the overlay's flag.
 */
const isMainLoading = computed(() => isLoading(MAIN_LOADING_KEYS));

/**
 * Whether a domain store is working — the corner indicator's flag. Every domain store's
 * `resourceKey` (`'cart'`, `'accountProfile'`, …) lives on the app's one shared `QueryClient`
 * now, so this reads that instead of `useCoreStore`'s dictionary, which no toolkit composable
 * writes to any more.
 */
const isSideLoading = useIsLoading(SIDE_LOADING_KEYS, queryClient);

/**
 * The indicator's own visibility. `useIsLoading` reads an empty prefix list as "every resource",
 * so a build whose modules declare no `loadingKeys` must not light it for all traffic.
 */
const showSideLoading = computed(
    () => SIDE_LOADING_KEYS.length > 0 && isSideLoading.value && !isMainLoading.value
);

/**
 * Whether the footer offers "Privacy choices" — only when Umami is configured, same as the banner.
 */
const analyticsConsentEnabled = isAnalyticsConsentEnabled();

/**
 * The guest consent store, whose `reopen()` the footer link calls.
 */
const analyticsConsent = useAnalyticsConsentStore();

/**
 * Reactive toast queue, rendered below as one `v-alert` per visible message.
 */
const { messages } = storeToRefs(useNotificationsStore());

/**
 * Dismisses a toast by id, wired to each alert's close button.
 */
const { hideMessage } = useNotificationsStore();

/**
 * Coerces free-form message types into what `v-alert` accepts.
 *
 * @param type - Type carried by the notification, possibly unset or unknown.
 * @returns The matching alert type, or `'info'` as a neutral fallback.
 */
const normalizeAlertType = (type?: string): 'success' | 'info' | 'warning' | 'error' =>
    type === 'success' || type === 'warning' || type === 'error' ? type : 'info';

/**
 * The router, for the re-evaluation a dead session triggers below.
 */
const router = useRouter();

/**
 * The session store's own counter, bumped only when a session died on its own (a refresh the
 * server definitively refused) and never on an explicit logout.
 */
const { expiredSignal } = storeToRefs(useSessionStore());

/**
 * A session that died on its own: say so, then re-enter the current route. A forced `replace` to
 * the same address runs the route guard again, which sends a protected page to login with `?continue=` and
 * leaves a public one where it is, so the visitor is never left on a signed-in-looking page whose
 * every request fails.
 */
watch(expiredSignal, () => {
    useNotificationsStore().addMessage(t('session-expired.message'));
    // `force`: a navigation to the address already shown is otherwise dropped as a duplicate,
    // and the guard is exactly what has to run again.
    void router.replace({ path: route.path, query: route.query, hash: route.hash, force: true });
});

/*
 * The layout preloads nothing.
 *
 * The session's `viewer` projection is loaded by `tryRestoreAuth` on the very first navigation,
 * before any component mounts, so the shell already has what it needs to render a name — and the
 * *editable* user record is fetched by the account module's own view, when someone actually opens
 * it. Fetching it here would cost a request on every page load for a signed-in visitor, and would
 * be the one reason for the app shell to know what a `User` is.
 */
</script>

<template>
    <v-app>
        <!--
            Skip link (WCAG 2.4.1): the first focusable thing on every page, visible only while it
            has focus — see `.skip-link` in main.css. Lands on `<v-main>` below, which is focusable
            for exactly this reason.
        -->
        <a href="#main" class="skip-link" @click.prevent="skipToContent">{{
            t('navigation.skip-to-content')
        }}</a>

        <AppHealthBanner />

        <!-- Rides every page too, same reasoning as the verification banner: a guest who never
             saw this outside checkout has never actually been asked. Renders nothing unless
             Umami is configured. -->
        <AppAnalyticsConsentBanner />

        <AppNavigation />

        <!--
            `tabindex="-1"` makes the main region focusable by script and the skip link without
            adding it to the tab order; the router moves focus here after every page change.
            An id here, not `data-main-content` fed by `$attrs`: this element no longer changes
            per view, so the CURRENT page's own id lives on ITS OWN root instead.
        -->
        <v-main tabindex="-1" data-main-content>
            <!--
                Rides every page on purpose: the checkout is too late to learn the address is
                unproved. Inside `<v-main>`, not beside the app bar: a plain alert is not part of
                Vuetify's layout, so up there it sat underneath the fixed bar, unseen and
                unclickable.
            -->
            <AppVerificationBanner />

            <!-- Page hero: every view gets a consistent, accessible title area, unless its own
                 route opted out (`meta.customHero`) to render `ui/molecules/PageHeader.vue`
                 itself, further down in its own body. -->
            <PageHeader v-if="!customHero && heroTitle" :title="heroTitle" />

            <div
                class="mx-auto w-full max-w-[1280px] px-4 pb-12"
                :class="
                    centered && 'flex min-h-[60vh] flex-col items-center justify-center text-center'
                "
            >
                <RouterView />
            </div>
        </v-main>

        <!--
            Minimal footer, so every page has a `contentinfo` landmark to jump to. The links are
            the same four prose pages the About page cross-links; nothing else belongs here.
        -->
        <v-footer tag="footer" border="t" class="justify-center py-4 text-sm">
            <nav
                class="flex flex-wrap justify-center gap-4"
                :aria-label="t('navigation.label-legal')"
            >
                <RouterLink
                    v-for="link in legalLinks"
                    :key="'footer-' + link.page"
                    class="underline opacity-80"
                    :to="link.to"
                >
                    {{ t(`static-pages.${link.page}.title`) }}
                </RouterLink>
                <!-- Reopens the consent banner, so a visitor can withdraw as easily as they agreed. -->
                <button
                    v-if="analyticsConsentEnabled"
                    type="button"
                    class="cursor-pointer border-0 bg-transparent p-0 text-on-surface underline opacity-80"
                    data-test="privacy-choices-link"
                    @click="analyticsConsent.reopen()"
                >
                    {{ t('analytics-consent.privacy-choices') }}
                </button>
            </nav>
        </v-footer>

        <!-- The one confirmation dialog, fed by `useDialogStore().confirm(...)` -->
        <DialogHost />

        <!-- The step-up prompt, opened by the http layer's `REAUTH_REQUIRED` interceptor -->
        <ReauthDialog />

        <!--
            Toast stack. The wrapper is a named region, NOT a live region: each alert announces
            itself — `alert` for an error, which interrupts, `status` for the rest, which waits.
            A single `aria-live` wrapper would read every toast at the same urgency and, because a
            hidden node is still in the DOM, would announce nothing when one was shown again.
            `v-if` rather than `v-show` for the same reason: a re-shown alert has to be re-inserted
            to be re-announced.
        -->
        <div
            class="fixed bottom-4 right-4 z-[9999] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
            role="region"
            :aria-label="t('generic.notifications')"
        >
            <template v-for="alert in messages" :key="'alert-' + alert.id">
                <v-alert
                    v-if="alert.visible"
                    :role="alert.type === 'error' ? 'alert' : 'status'"
                    :type="normalizeAlertType(alert.type)"
                    closable
                    density="comfortable"
                    elevation="4"
                    :text="alert.message"
                    @click:close="hideMessage(alert.id)"
                />
            </template>
        </div>

        <!-- Full-page loader (core bootstrapping) -->
        <v-overlay :model-value="isMainLoading" persistent class="flex items-center justify-center">
            <!--
                The label is required, not decorative: this renders role="progressbar", and a
                progressbar with no accessible name is announced as an unlabelled control. It is
                also the only thing on screen while the app boots, so without it a screen-reader
                user is told nothing at all is happening.
            -->
            <v-progress-circular
                indeterminate
                size="64"
                width="5"
                color="primary"
                :aria-label="t('generic.loading-state')"
            />
        </v-overlay>

        <!-- Discreet corner loader (background activity) -->
        <v-fade-transition>
            <div
                v-show="showSideLoading"
                class="fixed bottom-4 left-4 z-[9998]"
                role="status"
                data-test="activity-indicator"
                :aria-label="t('generic.loading-state')"
            >
                <!--
                    Labelled even though the wrapper above carries role="status" and the same
                    label: the wrapper names the live region, while this element is a separate
                    role="progressbar" node that needs its own name.
                -->
                <v-progress-circular
                    indeterminate
                    size="40"
                    width="4"
                    color="secondary"
                    :aria-label="t('generic.loading-state')"
                />
            </div>
        </v-fade-transition>
    </v-app>
</template>
