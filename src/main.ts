import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/utils/i18n.ts';
import { mergeApiLocales } from '@/utils/localeApi.ts';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';

import App from './App.vue';
import router from './router';

/**
 * Global CSS
 * main.css must come first: it declares the @layer order for the whole app
 * (Vuetify layers, then Tailwind utilities). Fonts are self-hosted.
 */
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@/styles/main.css';
import vuetify from '@/plugins/vuetify/index.ts';
import { logger } from '@/utils/logger.ts';

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
        ? import('../tests/mocks/apiMock.ts').then(({ initializeApiMocking }) =>
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

            // Track application mount (after init so the event is not silently dropped).
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
