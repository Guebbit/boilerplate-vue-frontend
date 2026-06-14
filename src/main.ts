import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/utils/i18n.ts';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';

import App from './App.vue';
import router from './router';
import { initializeApiMocking } from '../.dev/mocks/apiMock.ts';

/**
 * Global CSS
 */
import '@/styles/theme.scss';
import '@/styles/main.scss';

/**
 * Vue3 App
 */

const bootstrapApplication = async () => {
    await initializeApiMocking();
    const app = createApp(App);

    // Pinia must be registered before any store is instantiated.
    app.use(createPinia()).use(router).use(i18n).mount('#app');

    // Obtain the observability store (Sentry + PostHog).
    const observability = useObservabilityStore();

    // Sentry = error/performance monitoring.
    // Initialised after the app is mounted so the router is available.
    observability.initSentry(router);

    // PostHog = product analytics + feature flags.
    // Must be initialised before any track() call, which is a no-op when posthogReady is false.
    observability.initPostHog();

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