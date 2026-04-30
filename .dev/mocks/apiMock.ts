import { setupWorker } from 'msw/browser';
import { registerAccountMockHandlers } from './handlers/accountMockHandlers.ts';
import { registerUsersMockHandlers } from './handlers/usersMockHandlers.ts';
import { registerProductsMockHandlers } from './handlers/productsMockHandlers.ts';
import { registerCartMockHandlers } from './handlers/cartMockHandlers.ts';
import { registerOrdersMockHandlers } from './handlers/ordersMockHandlers.ts';

let workerStartPromise: Promise<void> | undefined;

export const initializeApiMocking = async () => {
    if (import.meta.env.VITE_API_MOCK_ENABLED !== 'true') return;
    if (workerStartPromise) return workerStartPromise;

    const worker = setupWorker(
        ...registerAccountMockHandlers(),
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
        .then(() => {});

    return workerStartPromise;
};
