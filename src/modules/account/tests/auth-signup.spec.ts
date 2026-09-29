/**
 * @module
 * Unit tests for the auth store's `signup` and its avatar follow-up, pinning the request each
 * produces. Same shape as the products/users store specs: `@api` is NOT mocked, since the
 * multipart encoding under test lives in the generated client — the transport (`orvalMutator`) is
 * mocked instead, so every assertion is about the request that actually goes out.
 *
 * Signup is JSON-only (the API takes no image from a stranger); a picked avatar is the
 * follow-up `PATCH /account` pinned at the bottom.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                orvalEnvelope({ id: 'u1', username: 'ada', email: 'ada@example.com' })
            )
        )
    )
}));

/**
 * The axios config handed to orvalMutator on its most recent call.
 */
const lastRequest = () => {
    const call = vi.mocked(orvalMutator).mock.calls.at(-1);
    if (!call) throw new Error('orvalMutator was never called');
    return call[0] as { url: string; method: string; data: unknown };
};

/**
 * The most recent request with this method and url — the avatar PATCH is followed by refetches.
 */
const lastRequestTo = (method: string, url: string) => {
    const call = vi
        .mocked(orvalMutator)
        .mock.calls.findLast(([config]) => config.method === method && config.url === url);
    if (!call) throw new Error(`no ${method} ${url} request was made`);
    return call;
};

/**
 * The avatar PATCH's body, asserting it was multipart-encoded.
 */
const avatarFormData = () => {
    const { data } = lastRequestTo('PATCH', '/account')[0] as { data: unknown };
    if (!(data instanceof FormData)) throw new Error('last request body was not FormData');
    return data;
};

/**
 * A fresh avatar file per call, for signup's optional image-upload field.
 */
const IMAGE = () => new File(['x'], 'avatar.png', { type: 'image/png' });

/**
 * A fully-specified account, for the cases that are not about the defaults.
 */
const CREDENTIALS = {
    email: 'ada@example.com',
    password: 'hunter2hunter2',
    username: 'ada',
    passwordConfirm: 'hunter2hunter2',
    termsAccepted: true as const
};

describe('useAuthStore.signup', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('posts JSON when no image is attached', () =>
        useAuthStore()
            .signup({ email: 'ada@example.com', password: 'hunter2hunter2', termsAccepted: true })
            .then(() => {
                const request = lastRequest();
                expect(request).toMatchObject({ url: '/account/signup', method: 'POST' });
                expect(request.data).not.toBeInstanceOf(FormData);
                expect(request.data).toMatchObject({ email: 'ada@example.com' });
            }));

    /**
     * The API takes no file at signup, so the request is JSON whatever the form held — a store
     * that still built multipart would be refused by a route that no longer mounts multer.
     */
    it('carries every scalar field in the JSON body', () =>
        useAuthStore()
            .signup(CREDENTIALS)
            .then(() => {
                expect(lastRequest().data).toMatchObject({
                    email: 'ada@example.com',
                    username: 'ada',
                    password: 'hunter2hunter2',
                    passwordConfirm: 'hunter2hunter2'
                });
            }));

    it('defaults the username to the email address', () =>
        useAuthStore()
            .signup({ email: 'ada@example.com', password: 'hunter2hunter2', termsAccepted: true })
            .then(() => {
                expect(lastRequest().data).toMatchObject({ username: 'ada@example.com' });
            }));

    /**
     * The avatar is its own request, as the account signup just opened: `PATCH /account`, multipart,
     * after a token is minted and the profile loaded.
     */
    it('stores a picked avatar as a follow-up PATCH /account', () =>
        useAuthStore()
            .setAvatarAfterSignup(IMAGE())
            .then(() => {
                expect(avatarFormData().get('imageUpload')).toBeInstanceOf(File);
            }));

    /**
     * `orvalMutator`'s second argument is the whole reason it takes one — `Signup.vue` passes
     * `onUploadProgress` through it to drive the progress bar of the avatar upload.
     */
    it('forwards the upload progress callback on the avatar request', () => {
        const onUploadProgress = vi.fn();

        return useAuthStore()
            .setAvatarAfterSignup(IMAGE(), { onUploadProgress })
            .then(() => {
                expect(lastRequestTo('PATCH', '/account')[1]).toEqual(
                    expect.objectContaining({ onUploadProgress })
                );
            });
    });

    it('keeps the store id stable', () => {
        // Pinia keys the store, devtools and any persistence plugin by this string, and every
        // other test here reaches the store through useAuthStore() so none would notice.
        expect(useAuthStore().$id).toBe('accountAuth');
    });
});
