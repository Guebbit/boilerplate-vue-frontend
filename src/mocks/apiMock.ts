import MockAdapter from 'axios-mock-adapter';
import httpClient from '@/utils/http.ts';
import { registerAccountMockHandlers } from '@/mocks/handlers/accountMockHandlers.ts';
import { registerUsersMockHandlers } from '@/mocks/handlers/usersMockHandlers.ts';
import { registerProductsMockHandlers } from '@/mocks/handlers/productsMockHandlers.ts';
import { registerCartMockHandlers } from '@/mocks/handlers/cartMockHandlers.ts';
import { registerOrdersMockHandlers } from '@/mocks/handlers/ordersMockHandlers.ts';

let mockAdapterInstance: MockAdapter | undefined;

export const initializeApiMocking = () => {
    const shouldEnableMock = import.meta.env.VITE_API_MOCK_ENABLED === 'true';
    if (!shouldEnableMock) return;
    if (mockAdapterInstance) return mockAdapterInstance;

    const mockAdapter = new MockAdapter(httpClient, {
        delayResponse: 250,
        onNoMatch: 'passthrough'
    });

    registerAccountMockHandlers(mockAdapter);
    registerUsersMockHandlers(mockAdapter);
    registerProductsMockHandlers(mockAdapter);
    registerCartMockHandlers(mockAdapter);
    registerOrdersMockHandlers(mockAdapter);

    mockAdapterInstance = mockAdapter;
    return mockAdapterInstance;
};
