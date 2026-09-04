/**
 * @module
 * Unit tests for `stores/profile.ts`'s `updateProfile` avatar branches: the multipart upload an
 * `imageUpload` switches to, progress forwarded through to the transport, and the plain-JSON
 * `imageUrl: ''` remove path. `profile.spec.ts` covers every other field of the same action; this
 * file is only about the picture, which is why it is split out — same split the plan's testing
 * table draws.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { orvalMutator } from '@/infrastructure/http';

const USER = { id: 'u1', username: 'ada', email: 'ada@example.com', admin: false };

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
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

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account': { data: USER },
        'PUT /account': { data: { ...USER, imageUrl: undefined } }
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
                const put = calls().find(({ method }) => method?.toUpperCase() === 'PUT')!;
                expect(put.headers?.['Content-Type']).toBe('multipart/form-data');
                expect(put.data).toBeInstanceOf(FormData);
                expect((put.data as FormData).get('imageUpload')).toBe(file);
                expect((put.data as FormData).has('imageUrl')).toBe(false);
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
    it('sends imageUrl: "" through the plain JSON path — not multipart', () => {
        const store = useProfileStore();

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ imageUrl: '' }))
            .then(() => {
                const put = calls().find(({ method }) => method?.toUpperCase() === 'PUT')!;
                expect(put.headers?.['Content-Type']).not.toBe('multipart/form-data');
                expect(put.data).toMatchObject({ imageUrl: '' });
            });
    });
});
