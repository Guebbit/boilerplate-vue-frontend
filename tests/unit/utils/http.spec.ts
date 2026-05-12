import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/profile', () => ({
    useProfileStore: vi.fn(() => ({ accessToken: { value: undefined } }))
}));

vi.mock('pinia', () => ({
    storeToRefs: (store: { accessToken: { value: undefined } }) => store
}));

vi.mock('@/utils/i18n.ts', () => ({
    getCurrentLocale: vi.fn(() => 'en')
}));

const makeAxiosError = (status: number, data: unknown, headers: Record<string, string> = {}) => ({
    response: { status, statusText: 'Error', data, headers },
    message: 'Request failed',
    config: { url: '/test' }
});

describe('onResponseReject', () => {
    it('passes through a standard reject envelope unchanged', async () => {
        const { onResponseReject } = await import('@/utils/http.ts');
        const error = makeAxiosError(400, {
            success: false,
            message: 'Bad',
            errors: ['field required']
        });

        await expect(onResponseReject(error as never)).rejects.toMatchObject({
            success: false,
            message: 'Bad',
            errors: ['field required']
        });
    });

    it('enriches a reject envelope with x-request-id and x-trace-id headers', async () => {
        const { onResponseReject } = await import('@/utils/http.ts');
        const error = makeAxiosError(
            422,
            { success: false, message: 'Validation', errors: ['name required'] },
            // eslint-disable-next-line @typescript-eslint/naming-convention
            { 'x-request-id': 'req-abc-123', 'x-trace-id': 'trace-xyz-789' }
        );

        await expect(onResponseReject(error as never)).rejects.toMatchObject({
            errors: ['name required'],
            requestId: 'req-abc-123',
            traceId: 'trace-xyz-789'
        });
    });

    it('captures x-request-id on a fallback transport error', async () => {
        const { onResponseReject } = await import('@/utils/http.ts');
        const error = makeAxiosError(
            503,
            {},
            {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-request-id': 'req-fallback-1'
            }
        );

        await expect(onResponseReject(error as never)).rejects.toMatchObject({
            success: false,
            requestId: 'req-fallback-1'
        });
    });

    it('normalizes 401 responses as authentication state errors', async () => {
        const { onResponseReject } = await import('@/utils/http.ts');
        const error = makeAxiosError(401, {});

        await expect(onResponseReject(error as never)).rejects.toMatchObject({
            success: false,
            status: 401,
            message: 'Unauthorized',
            errors: ['Unauthorized']
        });
    });

    it('normalizes 403 responses as authorization state errors', async () => {
        const { onResponseReject } = await import('@/utils/http.ts');
        const error = makeAxiosError(403, {});

        await expect(onResponseReject(error as never)).rejects.toMatchObject({
            success: false,
            status: 403,
            message: 'Forbidden',
            errors: ['Forbidden']
        });
    });

    it('omits requestId and traceId when headers are absent', async () => {
        const { onResponseReject } = await import('@/utils/http.ts');
        const error = makeAxiosError(500, {});

        const result = await onResponseReject(error as never).catch((error_: unknown) => error_);
        expect(result).not.toHaveProperty('requestId');
        expect(result).not.toHaveProperty('traceId');
    });
});
