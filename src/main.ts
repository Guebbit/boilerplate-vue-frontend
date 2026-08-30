/**
 * @module
 * The composition root's entry point: wires infrastructure (pinia, router, i18n, vuetify) to the
 * enabled modules' contributed data (response schemas, locale dictionaries), then boots the app
 * as one promise chain — remote-locale merge, mount, observability init, readiness signal — so
 * no step can race the one after it.
 */
import { createApp } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { i18n } from '@/infrastructure/i18n';
import { mergeRemoteLocales } from '@/infrastructure/i18n/locale-overrides.ts';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { analyticsEvents } from '@/infrastructure/observability/analytics-events.ts';

import App from './App.vue';
import router from '@/app/router';

/**
 * Global CSS
 * main.css must come first: it declares the @layer order for the whole app
 * (Vuetify layers, then Tailwind utilities). Fonts are self-hosted.
 */
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@/styles/main.css';
import vuetify from '@/ui/vuetify/index.ts';
import { logger } from '@/infrastructure/utils/logger.ts';
import { registerResponseSchemas } from '@/infrastructure/http/response-schema-map.ts';
import { registerLocaleContributors } from '@/infrastructure/i18n';
import { collectModuleLocales, collectModuleResponseSchemas } from '@/kernel/registry.ts';
import { enabledModules } from '@/modules.ts';

/*
 * Close the one loop the tier rule cannot express.
 *
 * `infrastructure` owns the http client and the i18n runtime; the response-schema rows and the dictionaries
 * are domain knowledge. `infrastructure` may not import `@/modules` — it is the bottom tier — so the
 * composition root hands the data down instead of letting the bottom reach up.
 *
 * At module scope, not inside `bootstrapApplication`: the first thing bootstrap does is fetch
 * `/locales`, and the router's locale guard loads a dictionary on the very first navigation.
 * Both would otherwise run before the wiring was installed.
 */
registerResponseSchemas(collectModuleResponseSchemas(enabledModules));
registerLocaleContributors(collectModuleLocales(enabledModules));

/**
 * Boots the Vue application: plugin registration, mount,
 * then observability init and readiness signalling.
 *
 * @returns A promise resolving once the app is mounted, the initial navigation
 *  has resolved and `globalThis._appReady` has been set for test runners.
 */
const bootstrapApplication = () =>
    Promise.resolve()
        .then(() => {
            /*
             * Pinia is created and ACTIVATED before the fetch below, and installed on the app
             * further down — the same instance, so nothing is set up twice.
             *
             * `setActivePinia` rather than `app.use(pinia)` here because the app must not be
             * created yet: everything from `createApp` to `mount` stays one synchronous block, so
             * no test or user can catch the page half-built. What the activation buys is the
             * request interceptor, which reads the session store for the access token — before
             * it, the boot fetch throws `getActivePinia() was called but there was no active
             * Pinia` into a `.catch` that reports it as "the API offered no languages". Silent,
             * shipped, and indistinguishable from an unreachable backend.
             */
            const pinia = createPinia();
            setActivePinia(pinia);

            /*
             * Ask the API which languages it offers and add any this build does not bundle, so a
             * language that exists only in the API's database still appears in the switcher.
             *
             * Sequenced BEFORE the app exists, because mounting installs the router and starts
             * the first navigation, and the locale guard reads `supportedLanguages` there — a
             * language missing from that list is redirected away before it can be offered.
             *
             * Never rejects: with the API unreachable this is a no-op and the languages
             * discovered from `src/locales/` stand on their own, which is what keeps the app
             * usable offline.
             */
            return mergeRemoteLocales().then(() => pinia);
        })
        .then((pinia) => {
            createApp(App).use(pinia).use(router).use(i18n).use(vuetify).mount('#app');

            // Obtain the observability store (Grafana Faro + Umami).
            const observability = useObservabilityStore();

            // Grafana Faro = error/crash monitoring + frontend tracing + web-vitals.
            // Captures uncaught errors and starts tracing fetch/XHR to the API.
            void observability.initFaro();

            // Umami = product analytics. Injects the tracker script; pageviews are
            // tracked automatically, custom events go through observability.track().
            observability.initUmami();

            // Track application mount. `initUmami()` above only injects the tag — the tracker
            // itself arrives a round-trip later, so this event is buffered by the store and sent
            // when the script lands rather than fired at a global that does not exist yet.
            observability.track(analyticsEvents.APP_STARTED);

            return router.isReady().then(() => {
                // Signal to Cypress (or any test runner) that the app is fully ready: Vue is
                // mounted and the initial navigation has resolved.
                (globalThis as typeof globalThis & { _appReady?: boolean })._appReady = true;

                // Track application fully ready
                observability.track(analyticsEvents.APP_READY);
            });
        });

void bootstrapApplication().catch((error) => {
    logger.error('[Bootstrap] Fatal error during application initialization:', error);
});
