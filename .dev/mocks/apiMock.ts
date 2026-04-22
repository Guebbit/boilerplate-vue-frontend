import MockAdapter from 'axios-mock-adapter';
import httpClient from '@/utils/http.ts';
import { registerAccountMockHandlers } from './handlers/accountMockHandlers.ts';
import { registerUsersMockHandlers } from './handlers/usersMockHandlers.ts';
import { registerProductsMockHandlers } from './handlers/productsMockHandlers.ts';
import { registerCartMockHandlers } from './handlers/cartMockHandlers.ts';
import { registerOrdersMockHandlers } from './handlers/ordersMockHandlers.ts';

let mockAdapterInstance: MockAdapter | undefined;

export const initializeApiMocking = () => {
    if (import.meta.env.VITE_API_MOCK_ENABLED !== 'true') return;
    if (mockAdapterInstance) return mockAdapterInstance;

    const mockAdapter = new MockAdapter(httpClient, {
        delayResponse: 250,
        // or else "passthrough": Unmatched requests go to the real network instead of returning a 404 error
        onNoMatch: 'throwException'
    });

    registerAccountMockHandlers(mockAdapter);
    registerUsersMockHandlers(mockAdapter);
    registerProductsMockHandlers(mockAdapter);
    registerCartMockHandlers(mockAdapter);
    registerOrdersMockHandlers(mockAdapter);

    mockAdapterInstance = mockAdapter;
    return mockAdapterInstance;
};
