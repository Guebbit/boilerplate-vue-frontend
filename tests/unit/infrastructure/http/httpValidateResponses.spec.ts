/**
 * `orvalMutator`'s contract-validation layer (`VITE_VALIDATE_RESPONSES`), tested against a real
 * HTTP server the same way `httpRefresh.spec.ts` tests the refresh flow — a stubbed axios
 * adapter wouldn't exercise the interceptor chain the mutator actually runs through.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

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
            { registerResponseSchemas },
            { collectModuleResponseSchemas },
            { enabledModules }
        ]) => {
            registerResponseSchemas(collectModuleResponseSchemas(enabledModules));
            return httpModule;
        }
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

    it('throws a contract error when VITE_VALIDATE_RESPONSES=true and a required field is missing', () => {
        server.use(
            http.get(`${API}/account`, () =>
                HttpResponse.json({ success: true, status: 200, message: 'ok', data: { id: '1' } })
            )
        );
        vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        return loadHttp().then(({ orvalMutator }) =>
            expect(orvalMutator({ url: '/account', method: 'GET' })).rejects.toThrow(
                /\[contract] response for GET \/account does not match the OpenAPI schema/
            )
        );
    });

    it('throws a contract error when the response carries an undeclared field (strict schema)', () => {
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
            expect(orvalMutator({ url: '/account', method: 'GET' })).rejects.toThrow(/\[contract]/)
        );
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
});
