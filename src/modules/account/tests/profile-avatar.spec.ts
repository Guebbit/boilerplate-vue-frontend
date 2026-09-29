/**
 * @module
 * Unit tests for `stores/profile.ts`'s `updateProfile` avatar branches: the multipart upload an
 * `imageUpload` switches to, progress forwarded through to the transport, and the plain-JSON
 * `imageUrl: null` remove path, and the per-path loading keys the two buttons spin on.
 * `profile.spec.ts` covers every other field of the same action; this file is only about the
 * picture, which is why it is split out — same split the plan's testing table draws.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

const USER = { id: 'u1', username: 'ada', email: 'ada@example.com', role: 'customer' };

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * Every call the transport received, with its config AND the per-call options
 * (`updateProfile`'s second argument) that `orvalMutator` receives separately in real usage.
 */
const calls = () =>
    vi.mocked(orvalMutator).mock.calls.map(
        (call) =>
            call[0] as {
                url: string;
                method?: string;
                headers?: Record<string, string>;
                data: unknown;
            }
    );

/**
 * Holds the next transport call open, so a loading flag can be read mid-flight.
 *
 * @returns The release function; calling it lets the gated call resolve.
 */
const gateNextCall = () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const send = vi.mocked(orvalMutator).getMockImplementation()!;
    vi.mocked(orvalMutator).mockImplementationOnce((config, options) =>
        gate.then(() => send(config, options))
    );
    return () => release?.();
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account': orvalEnvelope(USER),
        // The rules the server would publish for this viewer. The store unpacks them with CASL's
        // own reader, so a fixture that is not packed is a fixture no client could use.
        'GET /account/abilities': orvalEnvelope({
            platform: [],
            tenant: [
                ['read', 'Product', { active: true, deletedAt: null }],
                ['read', 'Order', { userId: 'u1', deletedAt: null }]
            ],
            version: 36,
            subjects: ['Order', 'Product']
        }),
        // PATCH, not PUT (AUDIT_0924 D17d) — `updateProfile` sends only the fields it was given.
        'PATCH /account': orvalEnvelope({ ...USER, imageUrl: undefined })
    };
});

describe('an imageUpload switches the call to multipart', () => {
    it('carries the file, not the old imageUrl field', () => {
        const store = useProfileStore();
        const file = new File(['pixels'], 'avatar.png', { type: 'image/png' });

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ imageUpload: file }))
            .then(() => {
                const patch = calls().find(({ method }) => method?.toUpperCase() === 'PATCH')!;
                expect(patch.headers?.['Content-Type']).toBe('multipart/form-data');
                expect(patch.data).toBeInstanceOf(FormData);
                expect((patch.data as FormData).get('imageUpload')).toBe(file);
                expect((patch.data as FormData).has('imageUrl')).toBe(false);
            });
    });

    it('sends a clear that shares the save as a second JSON PATCH, since multipart has no null', () => {
        const store = useProfileStore();
        const file = new File(['pixels'], 'avatar.png', { type: 'image/png' });

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ imageUpload: file, phone: null }))
            .then(() => {
                const patches = calls().filter(({ method }) => method?.toUpperCase() === 'PATCH');
                expect(patches).toHaveLength(2);
                expect((patches[0].data as FormData).has('phone')).toBe(false);
                expect(contractRequest(schemas.UpdateAccountBody, patches[1].data)).toEqual({
                    phone: null
                });
            });
    });

    it('forwards onUploadProgress through to the transport', () => {
        const store = useProfileStore();
        const file = new File(['pixels'], 'avatar.png', { type: 'image/png' });
        const onUploadProgress = vi.fn();

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ imageUpload: file }, { onUploadProgress }))
            .then(() => {
                const optionsSeen = vi
                    .mocked(orvalMutator)
                    .mock.calls.map((call) => call[1] as { onUploadProgress?: unknown } | undefined)
                    .find((options) => options?.onUploadProgress === onUploadProgress);
                expect(optionsSeen).toBeDefined();
            });
    });

    it('refetches the profile afterward, same as every other field', () => {
        const store = useProfileStore();
        const file = new File(['pixels'], 'avatar.png', { type: 'image/png' });

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ imageUpload: file }))
            .then(() => {
                const methods = calls().map(({ method }) => method?.toUpperCase());
                // ...GET, PUT, GET: the write, then the re-read `updateProfile` always chains.
                expect(methods.at(-1)).toBe('GET');
            });
    });
});

describe('removing the picture', () => {
    /**
     * the contract's `minLength: 1` refuses `''` with a live 422 — `null` is the only value
     * that reads as "remove it".
     */
    it('sends imageUrl: null through the plain JSON path — not multipart, never an empty string', () => {
        const store = useProfileStore();

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ imageUrl: null }))
            .then(() => {
                const patch = calls().find(({ method }) => method?.toUpperCase() === 'PATCH')!;
                expect(patch.headers?.['Content-Type']).not.toBe('multipart/form-data');
                expect(contractRequest(schemas.UpdateAccountBody, patch.data)).toMatchObject({
                    imageUrl: null
                });
            });
    });
});

describe('each avatar path owns its loading key', () => {
    it('flags the upload alone while the multipart call is in flight', () => {
        const store = useProfileStore();
        const file = new File(['pixels'], 'avatar.png', { type: 'image/png' });

        return store.fetchProfile(true).then(() => {
            const release = gateNextCall();
            const pending = store.updateProfile({ imageUpload: file });
            // The composable cancels in-flight queries before it raises the flag, so the write
            // is a tick away from being counted, not synchronous with the call.
            return vi
                .waitFor(() => expect(store.uploadingAvatar).toBe(true))
                .then(() => {
                    expect(store.removingAvatar).toBe(false);
                    release();
                    return pending;
                })
                .then(() => {
                    expect(store.uploadingAvatar).toBe(false);
                });
        });
    });

    it('flags the removal alone while the remove call is in flight', () => {
        const store = useProfileStore();

        return store.fetchProfile(true).then(() => {
            const release = gateNextCall();
            const pending = store.updateProfile({ imageUrl: null });
            return vi
                .waitFor(() => expect(store.removingAvatar).toBe(true))
                .then(() => {
                    expect(store.uploadingAvatar).toBe(false);
                    release();
                    return pending;
                })
                .then(() => {
                    expect(store.removingAvatar).toBe(false);
                });
        });
    });

    it('leaves both flags alone for an ordinary field save', () => {
        const store = useProfileStore();

        return store.fetchProfile(true).then(() => {
            const release = gateNextCall();
            const pending = store.updateProfile({ username: 'ada2' });
            // The store's own key rises, proving the call is counted — under the plain key,
            // with neither avatar flag following it.
            return vi
                .waitFor(() => expect(store.loading).toBe(true))
                .then(() => {
                    expect(store.uploadingAvatar).toBe(false);
                    expect(store.removingAvatar).toBe(false);
                    release();
                    return pending;
                });
        });
    });
});
