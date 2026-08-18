import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/infrastructure/i18n';
import { mergeApiLocales } from '@/infrastructure/i18n/apiDictionary.ts';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { analyticsEvents } from '@/infrastructure/observability/events.ts';

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
import { registerResponseSchemas } from '@/infrastructure/http/responseSchemaMap.ts';
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
 * Boots the Vue application: optional API mocking, plugin registration, mount,
 * then observability init and readiness signalling.
 *
 * @returns A promise resolving once the app is mounted, the initial navigation
 *  has resolved and `globalThis._appReady` has been set for test runners.
 */
const bootstrapApplication = () =>
    // Dynamic import so MSW and the mock handlers stay in a lazy chunk
    // that is never downloaded when mocking is disabled.
    (import.meta.env.VITE_API_MOCK_ENABLED === 'true'
        ? import('../tests/support/mocks/apiMock.ts').then(({ initializeApiMocking }) =>
              initializeApiMocking()
          )
        : Promise.resolve()
    )
        // Ask the API which languages it can answer in and add any this build does not know
        // about, so a language only the server has still appears in the switcher. Sequenced
        // before the mount because the router's locale guard reads `supportedLanguages` on the
        // very first navigation, and a language missing from that list is redirected away before
        // it can be offered.
        //
        // `mergeApiLocales` never rejects: with the API unreachable this is a no-op and the
        // build-time `VITE_APP_SUPPORTED_LOCALES` list stands on its own, which is what keeps the
        // app usable offline.
        .then(() => mergeApiLocales())
        .then(() => {
            const app = createApp(App);

            // Pinia must be registered before any store is instantiated.
            app.use(createPinia()).use(router).use(i18n).use(vuetify).mount('#app');

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
                // Signal to Cypress (or any test runner) that the app is fully ready:
                // MSW is running, Vue is mounted, and the initial navigation has resolved.
                (globalThis as typeof globalThis & { _appReady?: boolean })._appReady = true;

                // Track application fully ready
                observability.track(analyticsEvents.APP_READY);
            });
        });

void bootstrapApplication().catch((error) => {
    logger.error('[Bootstrap] Fatal error during application initialization:', error);
});
