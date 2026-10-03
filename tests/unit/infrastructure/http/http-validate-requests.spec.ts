/**
 * `orvalMutator`'s request-validation layer (`VITE_VALIDATE_REQUESTS`): the twin of the response
 * one, against a real HTTP server so the whole mutator path runs. It validates and never rewrites —
 * what it proves is that a call site which skipped `toRequestBody` is loud, and that a body which
 * was shaped properly is left exactly as it was.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';

/** Origin of the stub API. */
const API = 'http://api.test';

/** MSW server answering this file's stub endpoints (`setupServer` intercepts requests in Node). */
const server = setupServer();

/** What the stub endpoint received, so a test can prove the body went out untouched. */
let received: unknown;

/**
 * Loads a fresh `@/infrastructure/http` with the enabled modules' schema rows registered, as
 * `src/main.ts` does at boot — without the rows there is nothing to resolve a body schema from.
 */
const loadHttp = () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', API);
    return Promise.all([
        import('@/infrastructure/http'),
        import('@/infrastructure/http/response-schema-map'),
        import('@/kernel/registry'),
        import('@/modules')
    ]).then(
        ([
            httpModule,
            { loadResponseSchemas },
            { collectModuleResponseSchemas },
            { enabledModules }
        ]) =>
            loadResponseSchemas(collectModuleResponseSchemas(enabledModules)).then(() => httpModule)
    );
};

/**
 * Sends a `PATCH /account` with `data`, the operation whose body schema (`UpdateAccountBody`)
 * refuses `phone: ''`.
 *
 * @param data - The body to send.
 */
const patchAccount = (data: unknown) =>
    loadHttp().then(({ orvalMutator }) => orvalMutator({ url: '/account', method: 'PATCH', data }));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllEnvs();
    received = undefined;
    server.use(
        http.patch(`${API}/account`, ({ request }) =>
            request.json().then((body) => {
                received = body;
                return HttpResponse.json({ success: true, status: 200, message: 'ok', data: {} });
            })
        )
    );
});

describe('orvalMutator request validation', () => {
    it('is off by default inside Vitest, so a spec may send a partial body', () => {
        return patchAccount({ phone: '' }).then(() => {
            expect(received).toEqual({ phone: '' });
        });
    });

    it('rejects a body the contract refuses, naming the field, before anything is sent', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        return expect(patchAccount({ phone: '' })).rejects.toThrow(
            /request body for PATCH \/account[\S\s]*phone/
        );
    });

    it('sends nothing on a rejected body', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        return patchAccount({ phone: '' })
            .catch(() => undefined)
            .then(() => {
                expect(received).toBeUndefined();
            });
    });

    it('sends a conforming body exactly as it was given', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        return patchAccount({ phone: null }).then(() => {
            expect(received).toEqual({ phone: null });
        });
    });

    it('never rewrites: a `null` for a field that refuses it is rejected, not repaired', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        return expect(patchAccount({ username: null })).rejects.toThrow(/username/);
    });

    it('does not validate when VITE_VALIDATE_REQUESTS=false', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'false');
        return patchAccount({ phone: '' }).then(() => {
            expect(received).toEqual({ phone: '' });
        });
    });

    it('report-only (PROD): reports to Faro and still sends', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        vi.stubEnv('PROD', true);
        const captureException = vi.spyOn(useObservabilityStore(), 'captureException');

        return patchAccount({ phone: '' }).then(() => {
            expect(received).toEqual({ phone: '' });
            expect(captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest types expect.stringContaining() as any, since it is a placeholder matcher usable against anything
                    message: expect.stringContaining('request body for PATCH /account')
                })
            );
        });
    });

    it('skips a multipart body: the JSON schema of the same route does not describe a FormData', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        server.use(
            http.patch(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: {} })
            )
        );
        const form = new FormData();
        form.append('username', 'ann');
        return expect(patchAccount(form)).resolves.toBeDefined();
    });

    it('fails open for a route absent from the table', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        server.use(http.post(`${API}/nope`, () => HttpResponse.json({ ok: true })));
        return loadHttp().then(({ orvalMutator }) =>
            expect(
                orvalMutator({ url: '/nope', method: 'POST', data: { anything: '' } })
            ).resolves.toEqual({ ok: true })
        );
    });

    it('a bodyless call is never checked', () => {
        vi.stubEnv('VITE_VALIDATE_REQUESTS', 'true');
        server.use(http.get(`${API}/account`, () => HttpResponse.json({ ok: true })));
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).resolves.toEqual({ ok: true })
        );
    });
});
