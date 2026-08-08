/**
 * Assembles the MSW worker from the hand-written handlers.
 *
 * This is the ONLY place the mock backend is wired up. Note what is absent:
 * `tests/mocks/generated.ts` — orval's stub handlers — is deliberately NOT registered here.
 * Those stubs are stateless and return random faker data; registering them as a fallback
 * layer would replace working behaviour (cart persistence, auth, filtering) with noise and
 * would silence the `onUnhandledRequest` error below, which exists on purpose so that a
 * missing handler fails loudly instead of quietly 404-ing.
 *
 * A new handler file must be added to `setupWorker` below — there is no `handlers/index.ts`.
 *
 * See docs/tools/mocking.md for the parity invariants these handlers must satisfy.
 */
import { setupWorker } from 'msw/browser';
import { registerAccountMockHandlers } from './handlers/accountMockHandlers.ts';
import { registerAdminMockHandlers } from './handlers/adminMockHandlers.ts';
import { registerUsersMockHandlers } from './handlers/usersMockHandlers.ts';
import { registerProductsMockHandlers } from './handlers/productsMockHandlers.ts';
import { registerCartMockHandlers } from './handlers/cartMockHandlers.ts';
import { registerOrdersMockHandlers } from './handlers/ordersMockHandlers.ts';
import { registerLocalesMockHandlers } from './handlers/localesMockHandlers.ts';
import { mockDatabase } from './shared/mockShared.ts';
import { resolveProfile, resolveMockSeed } from './shared/mockProfiles.ts';

let workerStartPromise: Promise<void> | undefined;

export const initializeApiMocking = () => {
    if (import.meta.env.VITE_API_MOCK_ENABLED !== 'true') return Promise.resolve();
    if (workerStartPromise) return workerStartPromise;

    const worker = setupWorker(
        ...registerAccountMockHandlers(),
        ...registerAdminMockHandlers(),
        ...registerUsersMockHandlers(),
        ...registerProductsMockHandlers(),
        ...registerCartMockHandlers(),
        ...registerOrdersMockHandlers(),
        ...registerLocalesMockHandlers()
    );

    const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').origin;

    // Which profile built `mockDatabase` (imported above, already constructed by the time this
    // runs) and, for the random profile, the seed that reproduces this exact run — printed once
    // at worker start so a flaky-looking `test:e2e:random` failure can be re-run with
    // `RANDOM_DATA_SEED=<seed>` instead of chased blind. See tests/mocks/shared/mockProfiles.ts.
    //
    // The random branch's `resolveMockSeed()` re-enters the already-loaded (memoised) dynamic
    // import mockDatabase's own construction went through, so this never re-randomises anything
    // — it also means the seed profile never touches that import at all.
    const logActiveProfilePromise =
        resolveProfile() === 'random'
            ? resolveMockSeed().then((seed) => {
                  // eslint-disable-next-line no-console
                  console.log(`[Mock] profile=random seed=${seed}`);
              })
            : Promise.resolve().then(() => {
                  // eslint-disable-next-line no-console
                  console.log('[Mock] profile=seed');
              });

    workerStartPromise = logActiveProfilePromise
        .then(() =>
            worker.start({
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
            // eslint-disable-next-line no-console
            console.warn(
                '[Mock] Service worker failed to start — API calls will not be intercepted:',
                error
            );
        });

    return workerStartPromise;
};
