import { describe, expect, it } from 'vitest';
import { mockResponse } from '../../../.dev/mocks/shared/mockTransport.ts';

describe('mock transport helpers', () => {
    it('builds an axios-like response envelope with defaults', () => {
        const envelope = mockResponse({ id: 'user-1' });

        expect(envelope).toEqual({
            data: { id: 'user-1' },
            status: 200,
            headers: {},
            config: {},
            request: {}
        });
    });

    it('builds an envelope with custom status and headers', () => {
        const envelope = mockResponse({ message: 'ok' }, { status: 201, headers: { xTest: '1' } });

        expect(envelope).toEqual({
            data: { message: 'ok' },
            status: 201,
            headers: { xTest: '1' },
            config: {},
            request: {}
        });
    });
});
