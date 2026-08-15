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

    it('keeps the store id stable', () => {
        // Pinia keys the store, devtools and any persistence plugin by this string, and every
        // other test here reaches the store through `useAccountStore()` so none would notice.
        expect(useAccountStore().$id).toBe('account');
    });

    it('never parks the uploaded File in store state', () => {
        const store = useAccountStore();

        return store.signup({ ...CREDENTIALS, imageUpload: IMAGE() }).then(() => {
            expect(JSON.stringify(store.profile ?? {})).not.toContain('imageUpload');
        });
    });
});

/**
 * The address book.
 *
 * All four endpoints answer with the WHOLE book rather than with the row that changed, because
 * the invariant worth rendering after any write — exactly one default — is a property of the
 * list. So the thing to pin for each is the same: the right request goes out, and the local list
 * is replaced by the answer rather than patched locally.
 *
 * `removeAddress` is the one where that matters most: deleting the default promotes the oldest
 * survivor server-side, so a store that removed the row locally would show a book with no
 * default at all until the next reload.
 */
/** Makes the transport answer every address endpoint with this book. */
const respondWithBook = (addresses: unknown[]) =>
    vi.mocked(orvalMutator).mockResolvedValue({ data: { addresses } } as never);

describe('useAccountStore addresses', () => {
    const HOME = {
        id: 'a1',
        label: 'home',
        fullName: 'Ada Lovelace',
        street: '1 Main St',
        city: 'Springfield',
        zip: '11111',
        country: 'US',
        default: true
    };
    const WORK = {
        id: 'a2',
        label: 'office',
        fullName: 'Ada Lovelace',
        street: '2 Side St',
        city: 'Shelbyville',
        zip: '22222',
        country: 'US',
        default: false
    };

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('starts empty, before anything is fetched', () => {
        expect(useAccountStore().addresses).toEqual([]);
    });

    it('fetches the book and stores it', () => {
        respondWithBook([HOME, WORK]);
        const store = useAccountStore();

        return store.fetchAddresses().then((result) => {
            expect(lastRequest()).toMatchObject({ url: '/account/addresses', method: 'GET' });
            expect(store.addresses).toEqual([HOME, WORK]);
            expect(result).toEqual([HOME, WORK]);
        });
    });

    it('posts a new entry and replaces the book with the answer', () => {
        respondWithBook([HOME, WORK]);
        const store = useAccountStore();

        const { id: _id, default: _default, ...input } = WORK;

        return store.addAddress(input).then(() => {
            expect(lastRequest()).toMatchObject({ url: '/account/addresses', method: 'POST' });
            expect(store.addresses).toEqual([HOME, WORK]);
        });
    });

    it('puts a change to one entry, addressed by id', () => {
        respondWithBook([{ ...HOME, city: 'Ogdenville' }]);
        const store = useAccountStore();

        return store.updateAddress('a1', { city: 'Ogdenville' }).then(() => {
            expect(lastRequest()).toMatchObject({
                url: '/account/addresses/a1',
                method: 'PUT'
            });
            expect(store.addresses).toEqual([{ ...HOME, city: 'Ogdenville' }]);
        });
    });

    it('deletes an entry and takes the promoted default from the answer', () => {
        const store = useAccountStore();
        respondWithBook([HOME, WORK]);

        return store
            .fetchAddresses()
            .then(() => {
                // The server promotes WORK on deleting the default; the client must not guess it.
                respondWithBook([{ ...WORK, default: true }]);
                return store.removeAddress('a1');
            })
            .then(() => {
                expect(lastRequest()).toMatchObject({
                    url: '/account/addresses/a1',
                    method: 'DELETE'
                });
                expect(store.addresses).toEqual([{ ...WORK, default: true }]);
            });
    });

    it('reads a book-less payload as an empty book rather than as undefined', () => {
        // The `?? []` in `readAddressesResponse`. Every consumer does `addresses.map(...)`, so
        // an undefined here is a render crash rather than an empty state.
        vi.mocked(orvalMutator).mockResolvedValue({ data: {} } as never);
        const store = useAccountStore();

        return store.fetchAddresses().then((result) => {
            expect(result).toEqual([]);
            expect(store.addresses).toEqual([]);
        });
    });
});
