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

    workerStartPromise = worker
        .start({
            onUnhandledRequest: 'error',
            serviceWorker: {
                url: '/mockServiceWorker.js'
            }
        })
        .then(() => {});

    return workerStartPromise;
};
