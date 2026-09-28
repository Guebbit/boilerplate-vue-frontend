/**
 * @module
 * The composition root's entry point: wires infrastructure (pinia, router, i18n, vuetify) to the
 * enabled modules' contributed data (response schemas, locale dictionaries), then boots the app
 * as one promise chain — remote-locale merge, mount, observability init, readiness signal — so
 * no step can race the one after it. The response-schema contract loads lazily, after mount,
 * instead of joining that chain (FA94/FA-D2).
 */
import { createApp } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { i18n } from '@/i18n';
import { mergeRemoteLocales } from '@/infrastructure/locale-overrides.ts';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';

import App from './App.vue';
import router from '@/app/router';
import { handleUncaughtVueError } from '@/app/vue-error-handler.ts';

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
import { loadResponseSchemas } from '@/infrastructure/http/response-schema-map.ts';
import { shouldValidateResponses } from '@/infrastructure/http/validate.ts';
import { registerLocaleContributors } from '@/i18n';
import { collectModuleLocales, collectModuleResponseSchemas } from '@/kernel/registry.ts';
import { enabledModules } from '@/modules.ts';

/*
 * Close the one loop the tier rule cannot express.
 *
 * `infrastructure` owns the i18n runtime; the dictionaries are domain knowledge.
 * `infrastructure` may not import `@/modules` — it is the bottom tier — so the composition root
 * hands the data down instead of letting the bottom reach up.
 *
 * At module scope, not inside `bootstrapApplication`: the first thing bootstrap does is fetch
 * `/locales`, and the router's locale guard loads a dictionary on the very first navigation. That
 * would otherwise run before the wiring was installed.
 *
 * The response-schema rows are handed down the same way, but NOT here — see the lazy load after
 * mount below (FA94/FA-D2).
 */
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- createApp(App) is TypeScript-ESLint's own documented case: it cannot fully resolve a .vue SFC's component type
            const app = createApp(App).use(pinia).use(router).use(i18n).use(vuetify);

            // Anything a component's render/setup/watcher throws with nothing downstream to
            // catch it lands here instead of a blank page — see vue-error-handler.ts (FA74).
            app.config.errorHandler = handleUncaughtVueError;

            app.mount('#app');

            /*
             * FA94/FA-D2: `@api/schemas` (Zod + ~1,700 generated schemas, ~350 KB) is the
             * biggest single piece of the old entry chunk, and only response VALIDATION needs
             * it — the generated client's request/response TYPES cost nothing at runtime. Kick
             * off its chunk here, after the first paint above, not before: this call is
             * deliberately not awaited, and never joins the boot chain.
             *
             * `validateResponseAgainstContract` fails open for a route with no schema mapped
             * yet, so the handful of calls the app makes before this resolves are simply
             * unvalidated for that window, exactly like an unmapped route always is.
             */
            if (shouldValidateResponses()) {
                void loadResponseSchemas(collectModuleResponseSchemas(enabledModules)).catch(
                    (error: unknown) => {
                        logger.error(
                            '[Bootstrap] Failed to load response-validation schemas:',
                            error
                        );
                    }
                );
            }

            // Obtain the observability store (Grafana Faro + Umami).
            const observability = useObservabilityStore();

            // Grafana Faro = error/crash monitoring + frontend tracing + web-vitals.
            // Captures uncaught errors and starts tracing fetch/XHR to the API.
            void observability.initFaro();

            // Umami = product analytics. Injects the tracker script; the pageview for this
            // load is tracked automatically, so boot needs no custom event of its own.
            observability.initUmami();

            return router.isReady().then(() => {
                // Signal to Cypress (or any test runner) that the app is fully ready: Vue is
                // mounted and the initial navigation has resolved.
                (globalThis as typeof globalThis & { _appReady?: boolean })._appReady = true;
            });
        });

void bootstrapApplication().catch((error) => {
    logger.error('[Bootstrap] Fatal error during application initialization:', error);
});
