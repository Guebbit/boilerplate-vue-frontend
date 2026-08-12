/**
 * Unit tests for the account store's `signup`.
 *
 * Same shape as the products/users store specs: `@api` is NOT mocked, because the multipart
 * encoding is exactly what is under test and it lives in the generated client. The transport
 * (`orvalMutator`) is mocked instead, so every assertion is about the request that actually goes
 * out — JSON body vs. `FormData`, and which URL it lands on.
 *
 * `openapi.yaml` declares `SignupRequest.imageUpload` and the generator emits
 * `signupWithMultipart` for it, so the branch that picks between the two clients is the thing
 * worth pinning: a store that only ever called the JSON one would still pass a shape test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAccountStore } from '@/modules/account/store.ts';
import { orvalMutator } from '@/infrastructure/http';

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn(() =>
        Promise.resolve({ data: { id: 'u1', username: 'ada', email: 'ada@example.com' } })
    )
}));

/** The axios config handed to orvalMutator on its most recent call. */
const lastRequest = () => {
    const call = vi.mocked(orvalMutator).mock.calls.at(-1);
    if (!call) throw new Error('orvalMutator was never called');
    return call[0] as { url: string; method: string; data: unknown };
};

/** As above, asserting the body was multipart-encoded. */
const lastFormData = () => {
    const { data } = lastRequest();
    if (!(data instanceof FormData)) throw new Error('last request body was not FormData');
    return data;
};

const IMAGE = () => new File(['x'], 'avatar.png', { type: 'image/png' });

/** A fully-specified account, for the cases that are not about the defaults. */
const CREDENTIALS = {
    email: 'ada@example.com',
    password: 'hunter2hunter2',
    username: 'ada',
    passwordConfirm: 'hunter2hunter2'
};

describe('useAccountStore.signup', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('posts JSON when no image is attached', () =>
        useAccountStore()
            .signup({ email: 'ada@example.com', password: 'hunter2hunter2' })
            .then(() => {
                const request = lastRequest();
                expect(request).toMatchObject({ url: '/account/signup', method: 'POST' });
                expect(request.data).not.toBeInstanceOf(FormData);
                expect(request.data).toMatchObject({ email: 'ada@example.com' });
            }));

    it('posts multipart to the same endpoint when an image is attached', () =>
        useAccountStore()
            .signup({ ...CREDENTIALS, imageUpload: IMAGE() })
            .then(() => {
                expect(lastRequest()).toMatchObject({ url: '/account/signup', method: 'POST' });
                expect(lastFormData().get('imageUpload')).toBeInstanceOf(File);
            }));

    it('carries every scalar field into the multipart body, not just the file', () =>
        useAccountStore()
            .signup({ ...CREDENTIALS, imageUpload: IMAGE() })
            .then(() => {
                const formData = lastFormData();
                expect(formData.get('email')).toBe('ada@example.com');
                expect(formData.get('username')).toBe('ada');
                expect(formData.get('password')).toBe('hunter2hunter2');
                expect(formData.get('passwordConfirm')).toBe('hunter2hunter2');
            }));

    /**
     * The username default is `email`, and it survives the switch to multipart — a JSON-only
     * default that the other branch quietly dropped would be invisible until a signup with an
     * avatar produced an account named `undefined`.
     */
    it('applies the same username default on both branches', () => {
        const store = useAccountStore();

        return store
            .signup({ email: 'ada@example.com', password: 'hunter2hunter2' })
            .then(() => {
                expect(lastRequest().data).toMatchObject({ username: 'ada@example.com' });
                return store.signup({
                    email: 'ada@example.com',
                    password: 'hunter2hunter2',
                    imageUpload: IMAGE()
                });
            })
            .then(() => {
                expect(lastFormData().get('username')).toBe('ada@example.com');
            });
    });

    /**
     * `orvalMutator`'s second argument is the whole reason it takes one — `Signup.vue` passes
     * `onUploadProgress` through it to drive the progress bar.
     */
    it('forwards the upload progress callback to the transport', () => {
        const onUploadProgress = vi.fn();

        return useAccountStore()
            .signup({ ...CREDENTIALS, imageUpload: IMAGE() }, { onUploadProgress })
            .then(() => {
                expect(orvalMutator).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({ onUploadProgress })
                );
            });
    });

    it('never parks the uploaded File in store state', () => {
        const store = useAccountStore();

        return store.signup({ ...CREDENTIALS, imageUpload: IMAGE() }).then(() => {
            expect(JSON.stringify(store.profile ?? {})).not.toContain('imageUpload');
        });
    });
});
