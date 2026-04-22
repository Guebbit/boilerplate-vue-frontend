import { describe, expect, it } from 'vitest';
import { mockResponse, toMockReply } from '../../../.dev/mocks/shared/mockTransport.ts';

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

    it('creates axios-mock-adapter reply objects from domain payloads', () => {
        const reply = toMockReply({ message: 'ok' }, { status: 201, headers: { xTest: '1' } });

        expect(reply.status).toBe(201);
        expect(reply.headers).toEqual({ xTest: '1' });
        expect(reply.data).toEqual({
            data: { message: 'ok' },
            status: 201,
            headers: { xTest: '1' },
            config: {},
            request: {}
        });
    });
});
