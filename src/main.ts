import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n } from '@/utils/i18n.ts';
import { initSentry, initPostHog, track, AnalyticsEvents } from '@/plugins/observability';

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

    app.use(createPinia()).use(router).use(i18n).mount('#app');

    // Track application mount
    track(AnalyticsEvents.APP_STARTED);

    // Sentry = error/performance monitoring.
    // Initialised after the app is mounted so the router is available.
    initSentry(router);

    // PostHog = product analytics + feature flags.
    // Initialised alongside Sentry so both collectors share the same bootstrap cycle.
    initPostHog();

    await router.isReady();
    // Signal to Cypress (or any test runner) that the app is fully ready:
    // MSW is running, Vue is mounted, and the initial navigation has resolved.
    (globalThis as typeof globalThis & { _appReady?: boolean })._appReady = true;

    // Track application fully ready
    track(AnalyticsEvents.APP_READY);
};

void bootstrapApplication().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[Bootstrap] Fatal error during application initialization:', error);
});