/**
 * Assembles the MSW worker from the hand-written handlers.
 *
 * This is the ONLY place the mock backend is wired up, and it **names no domain**. Each module
 * carries its own handlers in `src/modules/<name>/mocks/handlers.ts` and declares them through
 * its manifest, so enabling a domain brings its mock backend along and `rm -rf`-ing the folder
 * takes it away — no list here to keep in step. Only `/locales` is registered by name, because it
 * belongs to `infrastructure` rather than to any domain.
 *
 * MSW is a convenience, not a contract — see docs/tools/mocking.md for what it does and does not
 * promise, and `test-e2e-live` in ci.yml for what proves behaviour instead.
 */
import { setupWorker } from 'msw/browser';
import { collectModuleMockHandlers, collectModuleMockSeeds } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { registerLocalesMockHandlers } from './localesHandlers.ts';
import { installMockSeedBuilder, mockDatabase } from './mockDb.ts';

let workerStartPromise: Promise<void> | undefined;

export const initializeApiMocking = () => {
    if (import.meta.env.VITE_API_MOCK_ENABLED !== 'true') return Promise.resolve();
    if (workerStartPromise) return workerStartPromise;

    const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').origin;

    workerStartPromise = Promise.resolve()
        /*
         * Supply `mockDb.ts` with the builder it declares but cannot reach — this is the only
         * place that knows the module list. It names no domain: the fold asks each enabled module
         * for its slice, so a deleted module simply stops contributing one. See
         * `installMockSeedBuilder`.
         */
        .then(() => installMockSeedBuilder(() => collectModuleMockSeeds(enabledModules)))
        // Every enabled module's handlers, loaded on demand — each one is behind a dynamic import
        // so that none of this reaches a production bundle. `/locales` is appended by name because
        // it is core's, not a domain's.
        .then(() => collectModuleMockHandlers(enabledModules))
        .then((moduleHandlers) =>
            setupWorker(...moduleHandlers, ...registerLocalesMockHandlers()).start({
                onUnhandledRequest: (request, print) => {
                    // Only error on unhandled requests to the API — let Vite module fetches through.
                    if (new URL(request.url).origin === apiOrigin) {
                        print.error();
                    }
                },
                serviceWorker: {
                    url: '/mockServiceWorker.js'
                }
            })
        )
        .then(() => {
            // When there is a default session (e.g. admin on first load), set the
            // isAuth cookie so restoreTokenIfNeeded() knows to attempt a refresh.
            // Without this, the cookie-gated guard skips refresh and the user
            // appears as a guest even though the mock has an active session.
            if (mockDatabase.currentAuthenticatedUserId)
                void cookieStore.set({
                    name: 'isAuth',
                    value: 'true',
                    path: '/',
                    sameSite: 'lax'
                });
        })
        .catch((error) => {
            console.warn(
                '[Mock] Service worker failed to start — API calls will not be intercepted:',
                error
            );
        });

    return workerStartPromise;
};
