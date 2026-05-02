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

    const sentryDsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
    const tracesSampleRateRaw =
        (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined) ?? '0';
    const tracesSampleRate = Number.parseFloat(tracesSampleRateRaw);

    if (sentryDsn)
        Sentry.init({
            app,
            dsn: sentryDsn,
            environment: import.meta.env.MODE,
            tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0
        });

    app.use(createPinia()).use(router).use(i18n).mount('#app');
    await router.isReady();
    // Signal to Cypress (or any test runner) that the app is fully ready:
    // MSW is running, Vue is mounted, and the initial navigation has resolved.
    (globalThis as typeof globalThis & { _appReady?: boolean })._appReady = true;
};

void bootstrapApplication();
