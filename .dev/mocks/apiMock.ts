import { setupWorker } from 'msw/browser';
import { registerAccountMockHandlers } from './handlers/accountMockHandlers.ts';
import { registerAdminMockHandlers } from './handlers/adminMockHandlers.ts';
import { registerUsersMockHandlers } from './handlers/usersMockHandlers.ts';
import { registerProductsMockHandlers } from './handlers/productsMockHandlers.ts';
import { registerCartMockHandlers } from './handlers/cartMockHandlers.ts';
import { registerOrdersMockHandlers } from './handlers/ordersMockHandlers.ts';
import { mockDatabase } from './shared/mockShared.ts';

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
        ...registerOrdersMockHandlers()
    );

    const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').origin;

    workerStartPromise = worker
        .start({
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
                    sameSite: 'lax',
                });
        })
        .catch((error) => {
            // eslint-disable-next-line no-console
            console.warn('[Mock] Service worker failed to start — API calls will not be intercepted:', error);
        });

    return workerStartPromise;
};
