/**
 * `orvalMutator`'s contract-validation layer (`VITE_VALIDATE_RESPONSES`), tested against a real
 * HTTP server the same way `http-refresh.spec.ts` tests the refresh flow — a stubbed axios
 * adapter wouldn't exercise the interceptor chain the mutator actually runs through.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';

const API = 'http://api.test';

const server = setupServer();

/**
 * Load a fresh `@/infrastructure/http` and wire the enabled modules' response schemas into it, exactly as
 * `src/main.ts` does at boot.
 *
 * The registration is not optional dressing. Every domain row — `/account` included — lives in
 * `src/modules/<name>/response-schemas.ts` now, and `vi.resetModules()` gives each test a brand new
 * `responseSchemaMap` holding only the handful of core rows. Skip the wiring and
 * `resolveResponseSchema` returns `undefined`, validation quietly no-ops, and the two tests that
 * assert a *throw* fail — which is how this helper earned its existence.
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
            // Awaited: the rows load lazily now (FA94/FA-D2), so every test below must wait for
            // them to be in place before it fires a request, exactly like `wireModulesIntoCore`
            // waits when a spec actually stubs `VITE_VALIDATE_RESPONSES`.
            loadResponseSchemas(collectModuleResponseSchemas(enabledModules)).then(() => httpModule)
    );
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllEnvs();
});

describe('orvalMutator contract validation', () => {
    it('is off by default inside Vitest, even though DEV is true (MODE is "test")', () => {
        // A response that violates GetAccountResponse (missing required `email`) — if
        // validation ran, this would throw.
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: { id: '1' } })
            )
        );
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).resolves.toMatchObject({
                data: { id: '1' }
            })
        );
    });

    it('is ON by default outside Vitest — a production build validates too (MODE decides)', () => {
        // Same violating response as above; with MODE stubbed away from 'test' and no flag set,
        // the default must validate — this is what lets the stores trust `response.data`.
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: { id: '1' } })
            )
        );
        vi.stubEnv('MODE', 'production');
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).rejects.toMatchObject({
                errors: [{ code: 'CONTRACT_MISMATCH' }]
            })
        );
    });

    it('resolves normally when VITE_VALIDATE_RESPONSES=true and the response satisfies its schema', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({
                    success: true,
                    status: 200,
                    message: 'ok',
                    data: { id: '1', email: 'a@b.com', username: 'alice' }
                })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).resolves.toMatchObject({
                data: { id: '1', email: 'a@b.com', username: 'alice' }
            })
        );
    });

    /**
     * A 204 has no content, which the contract models as `void`; axios hands back `''` for it, so
     * the validator has to be shown the absence, not that placeholder.
     */
    it('accepts a 204 for an operation the contract models as void', () => {
        server.use(
            http.post(
                `${API}/account/pending-email/resend`,
                () => new HttpResponse(null, { status: 204 })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        return loadHttp().then(({ orvalMutator }) =>
            expect(
                orvalMutator({ url: '/account/pending-email/resend', method: 'POST' })
            ).resolves.not.toMatchObject({ errors: [{ code: 'CONTRACT_MISMATCH' }] })
        );
    });

    /**
     * a contract mismatch is this deployment's own defect, never something a shopper can
     * act on — the rejection a call site sees is the same generic envelope every unreadable
     * failure gets, never the raw "[contract] ... does not match the OpenAPI schema" diagnostic.
     */
    it('rejects with a generic envelope, not the raw diagnostic, when a required field is missing', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: { id: '1' } })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).rejects.toMatchObject({
                success: false,
                status: 0,
                errors: [{ code: 'CONTRACT_MISMATCH' }]
            })
        );
    });

    it('rejects with the same generic envelope for an undeclared field (strict schema)', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({
                    success: true,
                    status: 200,
                    message: 'ok',
                    data: {
                        id: '1',
                        email: 'a@b.com',
                        username: 'alice',
                        // Not part of the OpenAPI schema — the exact class of bug (over-serialization)
                        // this validation exists to catch.
                        passwordHash: 'should-never-be-serialized'
                    }
                })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).rejects.toMatchObject({
                errors: [{ code: 'CONTRACT_MISMATCH' }]
            })
        );
    });

    it('reports the full field-level diagnostic to Faro, separate from what the call site sees', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: { id: '1' } })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        const captureException = vi.spyOn(useObservabilityStore(), 'captureException');

        return loadHttp()
            .then(({ orvalMutator }) =>
                orvalMutator({ url: '/account', method: 'GET' }).catch(() => undefined)
            )
            .then(() => {
                expect(captureException).toHaveBeenCalledWith(
                    expect.objectContaining({
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest types expect.stringContaining() as any, since it is a placeholder matcher usable against anything
                        message: expect.stringContaining(
                            '[contract] response for GET /account does not match the OpenAPI schema'
                        )
                    })
                );
            });
    });

    it('never validates when VITE_VALIDATE_RESPONSES=false, even for a non-conformant response', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: { id: '1' } })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'false');
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).resolves.toMatchObject({
                data: { id: '1' }
            })
        );
    });

    it('report-only (PROD): strips an undeclared field and resolves instead of rejecting', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({
                    success: true,
                    status: 200,
                    message: 'ok',
                    data: {
                        id: '1',
                        email: 'a@b.com',
                        username: 'alice',
                        passwordHash: 'should-never-be-serialized'
                    }
                })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        vi.stubEnv('PROD', true);
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).resolves.toMatchObject({
                data: { id: '1', email: 'a@b.com', username: 'alice' }
            })
        );
    });

    it('report-only (PROD): a genuinely missing field still reports to Faro but resolves', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: { id: '1' } })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        vi.stubEnv('PROD', true);
        const captureException = vi.spyOn(useObservabilityStore(), 'captureException');

        return loadHttp()
            .then(({ orvalMutator }) =>
                expect(orvalMutator({ url: '/account', method: 'GET' })).resolves.toMatchObject({
                    data: { id: '1' }
                })
            )
            .then(() => {
                expect(captureException).toHaveBeenCalledWith(
                    expect.objectContaining({
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest types expect.stringContaining() as any, since it is a placeholder matcher usable against anything
                        message: expect.stringContaining('does not match the OpenAPI schema')
                    })
                );
            });
    });

    it('fails open (warns, does not throw) for a route absent from the schema map', () => {
        server.use(
            http.get(`${API}/not-a-real-route`, () => HttpResponse.json({ anything: 'goes' }))
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
            /* no-op */
        });
        return loadHttp()
            .then(({ orvalMutator }) =>
                expect(
                    orvalMutator({ url: '/not-a-real-route', method: 'GET' })
                ).resolves.toMatchObject({ anything: 'goes' })
            )
            .then(() => {
                expect(warnSpy).toHaveBeenCalledWith(
                    expect.stringContaining('no response schema mapped for GET /not-a-real-route')
                );
                warnSpy.mockRestore();
            });
    });

    /**
     * The regression `resilience.cy.ts` caught: a request that lands before the lazy schema
     * chunk (FA94/FA-D2) resolves reads as "unmapped" too, for a route that DOES have a row —
     * the table is just still empty. Unlike a genuinely unmapped route, that must stay quiet.
     */
    it('stays quiet for a mapped route while the lazy schema chunk is still loading', () => {
        server.use(http.get(`${API}/locales`, () => HttpResponse.json({ languages: ['en'] })));
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
            /* no-op */
        });

        vi.resetModules();
        vi.stubEnv('VITE_API_URL', API);
        return Promise.all([
            import('@/infrastructure/http'),
            import('@/infrastructure/http/response-schema-map'),
            import('@/kernel/registry'),
            import('@/modules')
        ]).then(
            ([
                { orvalMutator },
                { loadResponseSchemas },
                { collectModuleResponseSchemas },
                { enabledModules }
            ]) => {
                // Deliberately NOT awaited — the request below fires into the same race window
                // `main.ts` leaves after mount, before this resolves.
                const loading = loadResponseSchemas(collectModuleResponseSchemas(enabledModules));
                return orvalMutator({ url: '/locales', method: 'GET' })
                    .then((response) => {
                        expect(response).toMatchObject({ languages: ['en'] });
                        expect(warnSpy).not.toHaveBeenCalled();
                    })
                    .finally(() => loading.then(() => warnSpy.mockRestore()));
            }
        );
    });
});
