/**
 * The `REAUTH_REQUIRED` step-up flow, driven through the real interceptor chain — the same
 * MSW-against-a-real-server approach `http-refresh.spec.ts` uses, and for the same reason: a
 * broken park-and-retry does not throw, it just leaves a request hanging or an old-password
 * request going through un-stepped-up.
 *
 * `app/components/ReauthDialog.vue` is not mounted here — this is a unit test of the
 * INTERCEPTOR's park/replay mechanics, so the dialog's outcome is driven directly through
 * `useReauthPromptStore()`, exactly as the real component would call it.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { useReauthPromptStore } from '@/infrastructure/http/reauth-prompt.ts';

const API = 'http://api.test';

interface LoggedRequest {
    route: string;
    authorization?: string;
}

/** How the protected route should answer. Reset before every case. */
interface Scenario {
    /** Whether `/checkout` still demands a fresh session. Flipped to `false` mid-test to simulate a successful reauth having rotated the session server-side. */
    requiresReauth: boolean;
}

let requestLog: LoggedRequest[] = [];
let scenario: Scenario = { requiresReauth: true };

/** A `REAUTH_REQUIRED` 401, matching what `requireFreshAuth` actually answers. */
const reauthRequired = () =>
    HttpResponse.json(
        {
            success: false,
            status: 401,
            message: 'Fresh authentication required',
            errors: [{ code: 'REAUTH_REQUIRED', message: 'Fresh authentication required' }]
        },
        { status: 401 }
    );

const server = setupServer(
    http.post(`${API}/checkout`, ({ request }) => {
        const authorization = request.headers.get('authorization') ?? undefined;
        requestLog.push({ route: 'POST /checkout', authorization });
        return scenario.requiresReauth
            ? reauthRequired()
            : HttpResponse.json({ success: true, status: 200, data: { orderId: 'o1' } });
    })
);

const loadHttp = () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', API);
    return import('@/infrastructure/http');
};

const routes = () => requestLog.map(({ route }) => route);
const timesRequested = (route: string) => requestLog.filter((r) => r.route === route).length;

/**
 * Waits until the step-up prompt is open — the interceptor's `requestStepUp()` runs after at
 * least one microtask past the mocked 401, so a bare `Promise.resolve().then()` is not reliably
 * late enough.
 *
 * @returns A promise resolving once `useReauthPromptStore().isOpen` is `true`.
 */
const waitForPrompt = () => vi.waitFor(() => expect(useReauthPromptStore().isOpen).toBe(true));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
    setActivePinia(createPinia());
    requestLog = [];
    scenario = { requiresReauth: true };
    vi.unstubAllEnvs();
});

describe('the REAUTH_REQUIRED step-up flow', () => {
    it('parks the request, opens the prompt, and replays once it resolves', () => {
        // The session is "fresh" again by the time the dialog resolves — a real reauth rotated it.
        return loadHttp().then(({ orvalMutator }) => {
            const pending = orvalMutator({ url: '/checkout', method: 'POST', data: {} });

            return waitForPrompt()
                .then(() => {
                    scenario.requiresReauth = false;
                    useReauthPromptStore().resolveStepUp();
                    return pending;
                })
                .then(() => {
                    expect(routes()).toEqual(['POST /checkout', 'POST /checkout']);
                    expect(useReauthPromptStore().isOpen).toBe(false);
                });
        });
    });

    it('shares one prompt between two REAUTH_REQUIRED 401s that arrive together', () =>
        loadHttp().then(({ orvalMutator }) => {
            const first = orvalMutator({ url: '/checkout', method: 'POST', data: {} });
            const second = orvalMutator({ url: '/checkout', method: 'POST', data: {} });

            return waitForPrompt()
                .then(() => {
                    scenario.requiresReauth = false;
                    useReauthPromptStore().resolveStepUp();
                    return Promise.all([first, second]);
                })
                .then(() => {
                    // Two calls in, one prompt, both replayed: four requests total, never a fifth.
                    expect(timesRequested('POST /checkout')).toBe(4);
                });
        }));

    it('rejects the parked request when the prompt is cancelled', () =>
        loadHttp().then(({ orvalMutator }) => {
            const pending = orvalMutator({ url: '/checkout', method: 'POST', data: {} });

            return waitForPrompt()
                .then(() => {
                    useReauthPromptStore().rejectStepUp(new Error('REAUTH_CANCELLED'));
                    return expect(pending).rejects.toMatchObject({
                        errors: [{ code: 'REAUTH_REQUIRED' }]
                    });
                })
                .then(() => {
                    // Never replayed: the visitor walked away instead of proving their password.
                    expect(timesRequested('POST /checkout')).toBe(1);
                });
        }));

    it('does not retry a second time when the replay still demands a fresh session', () =>
        loadHttp().then(({ orvalMutator }) => {
            // requiresReauth stays true — the replay 401s again too.
            const pending = orvalMutator({ url: '/checkout', method: 'POST', data: {} });

            return waitForPrompt()
                .then(() => {
                    useReauthPromptStore().resolveStepUp();
                    return expect(pending).rejects.toMatchObject({
                        errors: [{ code: 'REAUTH_REQUIRED' }]
                    });
                })
                .then(() => {
                    // `_dontRetry` on the replay stops a second prompt from opening.
                    expect(timesRequested('POST /checkout')).toBe(2);
                });
        }));
});
