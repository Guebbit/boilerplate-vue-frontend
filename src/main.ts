import { createApp } from 'vue';
import { createPinia } from 'pinia';
import * as Sentry from '@sentry/vue';
import { i18n } from '@/utils/i18n.ts';

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

    // Sentry = error/performance monitoring.
    // It helps you see crashes and slow pages in production.
    const sentryDsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
    const tracesSampleRateRaw =
        (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined) ?? '0';
    const tracesSampleRateParsed = Number.parseFloat(tracesSampleRateRaw);
    const tracesSampleRate = Number.isFinite(tracesSampleRateParsed)
        ? Math.min(Math.max(tracesSampleRateParsed, 0), 1)
        : 0;

    // No DSN => Sentry stays off.
    if (sentryDsn)
        Sentry.init({
            app,
            dsn: sentryDsn,
            environment: import.meta.env.MODE,
            // 0 = no tracing, 1 = trace everything.
            tracesSampleRate
        });

    app.use(createPinia()).use(router).use(i18n).mount('#app');
    await router.isReady();
    // Signal to Cypress (or any test runner) that the app is fully ready:
    // MSW is running, Vue is mounted, and the initial navigation has resolved.
    (globalThis as typeof globalThis & { _appReady?: boolean })._appReady = true;
};

void bootstrapApplication().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[Bootstrap] Fatal error during application initialization:', error);
});
