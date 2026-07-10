import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/utils/i18n.ts';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';

import App from './App.vue';
import router from './router';

/**
 * Global CSS
 */
import '@/styles/theme.scss';
import '@/styles/main.scss';

/**
 * Vue3 App
 */

const bootstrapApplication = async () => {
    // Dynamic import so MSW and the mock handlers stay in a lazy chunk
    // that is never downloaded when mocking is disabled.
    if (import.meta.env.VITE_API_MOCK_ENABLED === 'true') {
        const { initializeApiMocking } = await import('../tests/mocks/apiMock.ts');
        await initializeApiMocking();
    }
    const app = createApp(App);

    // Pinia must be registered before any store is instantiated.
    app.use(createPinia()).use(router).use(i18n).mount('#app');

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

    await router.isReady();
    // Signal to Cypress (or any test runner) that the app is fully ready:
    // MSW is running, Vue is mounted, and the initial navigation has resolved.
    (globalThis as typeof globalThis & { _appReady?: boolean })._appReady = true;

    // Track application fully ready
    observability.track(analyticsEvents.APP_READY);
};

void bootstrapApplication().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[Bootstrap] Fatal error during application initialization:', error);
});
