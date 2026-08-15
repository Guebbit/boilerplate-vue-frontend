/**
 * Assembles the MSW worker from the hand-written handlers.
 *
 * This is the ONLY place the mock backend is wired up, and it **names no domain**. Each module
 * carries its own handlers in `src/modules/<name>/mocks/handlers.ts` and declares them through
 * its manifest, so enabling a domain brings its mock backend along and `rm -rf`-ing the folder
 * takes it away — no list here to keep in step. Only `/locales` is registered by name, because it
 * belongs to `infrastructure` rather than to any domain.
 *
 * Note what is absent: `tests/support/mocks/generated.ts` — orval's stub handlers — is deliberately NOT
 * registered. Those stubs are stateless and return random faker data; registering them as a
 * fallback layer would replace working behaviour (cart persistence, auth, filtering) with noise
 * and would silence the `onUnhandledRequest` error below, which exists on purpose so that a
 * missing handler fails loudly instead of quietly 404-ing.
 *
 * See docs/tools/mocking.md for the parity invariants these handlers must satisfy.
 */
import { setupWorker } from 'msw/browser';
import { collectModuleMockHandlers, collectModuleMockSeeds } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { registerLocalesMockHandlers } from './localesHandlers.ts';
import { installMockSeedBuilder, mockDatabase } from './mockShared.ts';
import { resolveProfile, resolveMockSeed } from './mockProfiles.ts';

let workerStartPromise: Promise<void> | undefined;

export const initializeApiMocking = () => {
    if (import.meta.env.VITE_API_MOCK_ENABLED !== 'true') return Promise.resolve();
    if (workerStartPromise) return workerStartPromise;

    const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').origin;

    // Which profile is active and, for the random profile, the seed that reproduces this exact run
    // — printed once at worker start so a flaky-looking `test:e2e:random` failure can be re-run
    // with `RANDOM_DATA_SEED=<seed>` instead of chased blind. See tests/support/mocks/mockRandom.ts.
    //
    // The random branch's `resolveMockSeed()` re-enters the same memoised dynamic import the
    // database build goes through, so this never re-randomises anything — it also means the seed
    // profile never touches that import at all.
    const logActiveProfilePromise =
        resolveProfile() === 'random'
            ? resolveMockSeed().then((seed) => {
                  console.log(`[Mock] profile=random seed=${seed}`);
              })
            : Promise.resolve().then(() => {
                  console.log('[Mock] profile=seed');
              });

    workerStartPromise = logActiveProfilePromise
        /*
         * Supply `mockShared.ts` with the builder it declares but cannot reach — this is the only
         * place that knows both the module list and the active profile. It names no domain: the
         * fold asks each enabled module for its slice, so a deleted module simply stops
         * contributing one. See `installMockSeedBuilder`.
         *
         * `seedFaker()` runs once here, before the first slice, rather than inside any module's
         * generator: one seeded stream shared by every domain in a fixed order is what makes a
         * single RANDOM_DATA_SEED reproduce the whole dataset. Behind the same dynamic import as
         * everything else faker-shaped, so the seed profile never loads it.
         */
        .then(() =>
            installMockSeedBuilder(async () => {
                const profile = resolveProfile();
                if (profile === 'random')
                    await import('./mockRandom.ts').then((random) => random.seedFaker());
                return collectModuleMockSeeds(enabledModules, profile);
            })
        )
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
