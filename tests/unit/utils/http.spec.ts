import { describe, expect, it } from 'vitest';
import type { AxiosResponse } from 'axios';

import {
    normalizeResponseReject,
    normalizeResponseSuccess
} from '@/utils/httpResponseNormalization';

const createAxiosResponse = <T>(data: T): AxiosResponse<T> =>
    ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} }
    }) as AxiosResponse<T>;

describe('http response normalization', () => {
    it('unwraps response data when API mocking is disabled', () => {
        const response = createAxiosResponse({ data: { id: 'user-1' } });

        expect(normalizeResponseSuccess(response, false)).toEqual(response.data);
    });

    it('keeps the full axios response when API mocking is enabled', () => {
        const response = createAxiosResponse({ id: 'user-1' });

        expect(normalizeResponseSuccess(response, true)).toBe(response);
    });

    it('normalizes mocked error payloads', () => {
        expect(
            normalizeResponseReject(
                {
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'User not found'
                    }
                },
                404,
                true
            )
        ).toEqual({
            success: false,
            status: 404,
            message: 'User not found',
            errors: ['User not found']
        });
    });
});
