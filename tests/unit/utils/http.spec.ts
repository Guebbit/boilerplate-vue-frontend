import { afterEach, describe, expect, it } from 'vitest';
import type { AxiosError, AxiosResponse } from 'axios';

import { onResponseReject, onResponseSuccess } from '@/utils/http.ts';

const mockEnv = import.meta.env as Record<string, string | undefined>;
const originalMockEnabled = mockEnv.VITE_API_MOCK_ENABLED;

const createAxiosResponse = <T>(data: T): AxiosResponse<T> =>
    ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} }
    }) as AxiosResponse<T>;

afterEach(() => {
    mockEnv.VITE_API_MOCK_ENABLED = originalMockEnabled;
});

describe('http response interceptors', () => {
    it('unwraps response data when API mocking is disabled', () => {
        mockEnv.VITE_API_MOCK_ENABLED = 'false';
        const response = createAxiosResponse({ data: { id: 'user-1' } });

        expect(onResponseSuccess(response)).toEqual(response.data);
    });

    it('keeps the full axios response when API mocking is enabled', () => {
        mockEnv.VITE_API_MOCK_ENABLED = 'true';
        const response = createAxiosResponse({ id: 'user-1' });

        expect(onResponseSuccess(response)).toBe(response);
    });

    it('normalizes mocked error payloads', async () => {
        mockEnv.VITE_API_MOCK_ENABLED = 'true';
        const error = {
            response: {
                data: {
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'User not found'
                    }
                },
                status: 404
            }
        } as AxiosError;

        await expect(onResponseReject(error)).rejects.toEqual({
            success: false,
            status: 404,
            message: 'User not found',
            errors: ['User not found']
        });
    });
});
