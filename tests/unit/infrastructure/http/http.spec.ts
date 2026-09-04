import { beforeAll, describe, expect, it, vi } from 'vitest';
import enMessages from '@/locales/en.json';

vi.mock('@/infrastructure/session', () => ({
    useSessionStore: vi.fn(() => ({ accessToken: { value: undefined } }))
}));

vi.mock('pinia', () => ({
    storeToRefs: (store: { accessToken: { value: undefined } }) => store,
    // `@/infrastructure/http` now pulls in `step-up.ts` → `reauth-prompt.ts`, whose
    // `defineStore('reauthPrompt', ...)` call runs at import time — never invoked by these
    // onResponseReject-only tests, so a stub that satisfies the call without a real Pinia is enough.
    defineStore: () => vi.fn()
}));

/**
 * Only `getCurrentLocale` is stubbed. `translate` is deliberately the REAL one, resolving against
 * the real vue-i18n instance: these assertions are about what a user is shown when the API sent
 * no message of its own, and a stubbed translator would make every language look the same.
 */
vi.mock('@/infrastructure/i18n', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/infrastructure/i18n')>()),
    getCurrentLocale: vi.fn(() => 'en')
}));

beforeAll(() => import('@/infrastructure/i18n').then(({ loadLocale }) => loadLocale('en')));

const makeAxiosError = (status: number, data: unknown, headers: Record<string, string> = {}) => ({
    response: { status, statusText: 'Error', data, headers },
    message: 'Request failed',
    config: { url: '/test' }
});

describe('onResponseReject', () => {
    it('passes through a standard reject envelope unchanged', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            const error = makeAxiosError(400, {
                success: false,
                message: 'Bad',
                errors: [{ code: 'FIELD_REQUIRED', message: 'field required' }]
            });
            return expect(onResponseReject(error as never)).rejects.toMatchObject({
                success: false,
                message: 'Bad',
                errors: [{ code: 'FIELD_REQUIRED', message: 'field required' }]
            });
        });
    });

    it('enriches a reject envelope with x-request-id and x-trace-id headers', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            const error = makeAxiosError(
                422,
                {
                    success: false,
                    message: 'Validation',
                    errors: [{ code: 'NAME_REQUIRED', message: 'name required' }]
                },
                { 'x-request-id': 'req-abc-123', 'x-trace-id': 'trace-xyz-789' }
            );
            return expect(onResponseReject(error as never)).rejects.toMatchObject({
                errors: [{ code: 'NAME_REQUIRED', message: 'name required' }],
                requestId: 'req-abc-123',
                traceId: 'trace-xyz-789'
            });
        });
    });

    it('captures x-request-id on a fallback transport error', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            const error = makeAxiosError(
                503,
                {},
                {
                    'x-request-id': 'req-fallback-1'
                }
            );
            return expect(onResponseReject(error as never)).rejects.toMatchObject({
                success: false,
                requestId: 'req-fallback-1'
            });
        });
    });

    it('normalizes 401 responses as authentication state errors', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            const error = makeAxiosError(401, {});
            return expect(onResponseReject(error as never)).rejects.toMatchObject({
                success: false,
                status: 401,
                message: enMessages['api-errors'].unauthorized,
                errors: [{ code: 'UNAUTHORIZED', message: enMessages['api-errors'].unauthorized }]
            });
        });
    });

    it('normalizes 403 responses as authorization state errors', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            const error = makeAxiosError(403, {});
            return expect(onResponseReject(error as never)).rejects.toMatchObject({
                success: false,
                status: 403,
                message: enMessages['api-errors'].forbidden,
                errors: [{ code: 'FORBIDDEN', message: enMessages['api-errors'].forbidden }]
            });
        });
    });

    it('omits requestId and traceId when headers are absent', () => {
        return import('@/infrastructure/http')
            .then(({ onResponseReject }) => {
                const error = makeAxiosError(500, {});
                return onResponseReject(error as never).catch((error_: unknown) => error_);
            })
            .then((result) => {
                expect(result).not.toHaveProperty('requestId');
                expect(result).not.toHaveProperty('traceId');
            });
    });
});

/**
 * The fallback branch of `onResponseReject` — everything that is *not* a well-formed reject
 * envelope from the API. That covers real transport failures (no response at all), gateway errors
 * from a proxy that never reached the app, and any 4xx the API answers without its envelope.
 *
 * The canonicalised messages matter because they are what a user sees: an axios `statusText` of
 * "" or a raw "Network Error" is not something to put in front of someone, and 5xx detail must
 * not leak server internals into the UI.
 */
describe('onResponseReject — fallback normalisation', () => {
    it('canonicalises any 5xx to a single safe message', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            return expect(onResponseReject(makeAxiosError(503, {}) as never)).rejects.toMatchObject(
                {
                    status: 503,
                    message: enMessages['api-errors']['internal-server-error']
                }
            );
        });
    });

    it('treats exactly 500 as a server error', () =>
        // The `>= 500` boundary. With `> 500` a plain 500 would fall through and surface the raw
        // statusText instead — the single most common server failure, mis-messaged.
        import('@/infrastructure/http').then(({ onResponseReject }) =>
            expect(onResponseReject(makeAxiosError(500, {}) as never)).rejects.toMatchObject({
                message: enMessages['api-errors']['internal-server-error']
            })
        ));

    it('leaves a 4xx below the server range on its own message', () =>
        // The other side of the same boundary: 499 must NOT be canonicalised.
        import('@/infrastructure/http').then(({ onResponseReject }) =>
            expect(onResponseReject(makeAxiosError(499, {}) as never)).rejects.toMatchObject({
                status: 499,
                message: 'Error'
            })
        ));

    it('carries no error items for a status that is neither 401 nor 403', () =>
        // 401/403 get a user-facing item because the UI renders them as a state change; other
        // fallbacks deliberately carry an empty list rather than echoing a transport string.
        import('@/infrastructure/http')
            .then(({ onResponseReject }) =>
                onResponseReject(makeAxiosError(404, {}) as never).catch(
                    (error_: unknown) => error_
                )
            )
            .then((result) => {
                expect((result as { errors: string[] }).errors).toEqual([]);
            }));

    it('falls back to status 500 when there is no response at all', () =>
        // A DNS failure, a refused connection, a CORS block: `error.response` is undefined, and
        // every call site still needs a status to branch on.
        import('@/infrastructure/http').then(({ onResponseReject }) =>
            expect(
                onResponseReject({ message: 'Network Error', config: { url: '/x' } } as never)
            ).rejects.toMatchObject({ success: false, status: 500 })
        ));

    it('prefers statusText over the axios message', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            const error = {
                response: { status: 418, statusText: "I'm a teapot", data: {}, headers: {} },
                message: 'Request failed',
                config: { url: '/x' }
            };
            return expect(onResponseReject(error as never)).rejects.toMatchObject({
                message: "I'm a teapot"
            });
        });
    });

    it('falls back to the axios message when statusText is empty', () =>
        // `||`, not `??`: axios sets `statusText` to '' rather than undefined on many adapters,
        // and an empty message would render as a blank error toast.
        import('@/infrastructure/http').then(({ onResponseReject }) =>
            expect(
                onResponseReject({
                    response: { status: 418, statusText: '', data: {}, headers: {} },
                    message: 'Request failed',
                    config: { url: '/x' }
                } as never)
            ).rejects.toMatchObject({ message: 'Request failed' })
        ));

    it('falls back to a generic message when neither is available', () => {
        return import('@/infrastructure/http').then(({ onResponseReject }) => {
            const error = {
                response: { status: 418, statusText: '', data: {}, headers: {} },
                message: '',
                config: { url: '/x' }
            };
            return expect(onResponseReject(error as never)).rejects.toMatchObject({
                message: enMessages['api-errors'].unknown
            });
        });
    });

    it("keeps a server envelope's own message instead of the status fallback", () =>
        /*
         * The pass-through half of the `hasOwnProperty('errors')` rule, paired with the synthesis
         * half at 'carries no error items for a status that is neither 401 nor 403'. A 422 is the
         * status that separates them: neither branch rewrites its message, so the envelope's own
         * text surviving is the proof it was not rebuilt from `statusText`.
         *
         * The envelope carries a real `ErrorItem` because `ErrorResponse.errors` is `minItems: 1`
         * and the API guarantees it — `normalizeErrors` in the backend substitutes a fallback item
         * rather than ever sending an empty list.
         */
        import('@/infrastructure/http').then(({ onResponseReject }) =>
            expect(
                onResponseReject(
                    makeAxiosError(422, {
                        success: false,
                        status: 422,
                        message: 'Validation failed',
                        errors: [{ code: 'VALIDATION_ERROR', message: 'name required' }]
                    }) as never
                )
            ).rejects.toMatchObject({
                message: 'Validation failed',
                errors: [{ code: 'VALIDATION_ERROR', message: 'name required' }]
            })
        ));
});
