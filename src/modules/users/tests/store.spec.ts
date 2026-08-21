/**
 * Unit tests for the users store.
 *
 * Same shape as the products store, including why `@api` is not mocked — see the header there:
 * the multipart encoding lives in the generated client, so the transport is mocked instead and
 * the assertions are about the request that actually goes out.
 *
 * One extra thing is asserted here that has no products equivalent: `updateUser` receives a
 * password, and a password must not end up parked in client-side store state.
 *
 * Each `it` RETURNS its chain rather than awaiting — vitest fails a test whose returned promise
 * rejects, so the assertions inside a `.then` are as binding as awaited ones. See
 * `docs/tools/unit-testing.md`.
 */
import { asStub } from '../../../../tests/support/stub';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useUsersStore } from '@/modules/users/store';
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

/** Makes the transport answer with a paginated envelope for this test. */
const respondWithItems = (items: unknown[]) =>
    vi.mocked(orvalMutator).mockResolvedValue({ data: { items } });

/** The query parameters of the most recent request. */
/** The JSON body of the most recent request — what `POST /users/search` reads. */
const lastBody = () => asStub<{ data: Record<string, unknown> }>(lastRequest()).data;

describe('useUsersStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('createUser', () => {
        it('posts JSON when no avatar is attached', () =>
            useUsersStore()
                .createUser({
                    email: 'ada@example.com',
                    username: 'ada',
                    password: 'password123'
                })
                .then(() => {
                    const request = lastRequest();
                    expect(request).toMatchObject({ url: '/users', method: 'POST' });
                    expect(request.data).not.toBeInstanceOf(FormData);
                    expect(request.data).toMatchObject({
                        email: 'ada@example.com',
                        username: 'ada'
                    });
                }));

        it('posts multipart to /users when an avatar is attached', () =>
            useUsersStore()
                .createUser({
                    email: 'ada@example.com',
                    username: 'ada',
                    password: 'password123',
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/users', method: 'POST' });
                    expect(lastFormData().get('email')).toBe('ada@example.com');
                }));

        it('sends a Blob avatar, not only a File', () =>
            // The contract types the field as Blob, and encoders that recurse into anything that
            // is not a File (axios' `toFormData` among them) drop a plain Blob silently.
            useUsersStore()
                .createUser({
                    email: 'ada@example.com',
                    username: 'ada',
                    password: 'password123',
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    expect(lastFormData().get('imageUpload')).toBeInstanceOf(Blob);
                }));

        it('omits unset optional fields instead of sending the string "undefined"', () =>
            useUsersStore()
                .createUser({
                    email: 'ada@example.com',
                    username: 'ada',
                    password: 'password123',
                    admin: undefined,
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    const formData = lastFormData();
                    expect(formData.has('admin')).toBe(false);
                    expect([...formData.values()]).not.toContain('undefined');
                }));
    });

    describe('updateUser', () => {
        it('puts JSON when no new avatar is attached', () =>
            useUsersStore()
                .updateUser('u1', { username: 'ada2' })
                .then(() => {
                    const request = lastRequest();
                    expect(request).toMatchObject({ url: '/users/u1', method: 'PUT' });
                    expect(request.data).not.toBeInstanceOf(FormData);
                    expect(request.data).toMatchObject({ username: 'ada2' });
                }));

        it('puts multipart when an avatar is attached', () =>
            useUsersStore()
                .updateUser('u1', { username: 'ada2', imageUpload: new Blob(['x']) })
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/users/u1', method: 'PUT' });
                    expect(lastFormData().get('username')).toBe('ada2');
                }));

        it('never parks the submitted password in store state', () => {
            const store = useUsersStore();
            store.addUser({ id: 'u1', username: 'ada', email: 'ada@example.com' });

            return store
                .updateUser('u1', { username: 'ada2', password: 'hunter2hunter2' })
                .then(() => {
                    expect(JSON.stringify(store.users)).not.toContain('hunter2hunter2');
                });
        });

        it('never parks the uploaded Blob in store state', () => {
            const store = useUsersStore();
            store.addUser({ id: 'u1', username: 'ada', email: 'ada@example.com' });

            return store
                .updateUser('u1', { username: 'ada2', imageUpload: new Blob(['x']) })
                .then(() => {
                    expect(store.users.u1).not.toHaveProperty('imageUpload');
                });
        });

        /**
         * The reason `orvalMutator` takes a second argument at all — `UserEdit.vue` passes
         * `onUploadProgress` through it to drive its progress bar.
         */
        it('forwards the upload progress callback to the transport', () => {
            const onUploadProgress = vi.fn();

            return useUsersStore()
                .updateUser(
                    'u1',
                    { username: 'ada2', imageUpload: new Blob(['x']) },
                    { onUploadProgress }
                )
                .then(() => {
                    expect(orvalMutator).toHaveBeenCalledWith(
                        expect.anything(),
                        expect.objectContaining({ onUploadProgress })
                    );
                });
        });
    });

    describe('deleteUser', () => {
        it('calls the delete endpoint with the user id', () =>
            useUsersStore()
                .deleteUser('u1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/users/u1', method: 'DELETE' });
                }));
    });

    describe('hardDeleteUser', () => {
        /*
         * A separate method rather than a flag on `deleteUser`, because the two are not the same
         * operation: the soft form sets `deletedAt` and an admin can toggle it back, this one is
         * irreversible. Distinct names mean the destructive path cannot be reached by passing the
         * wrong boolean — so what is worth pinning is the URL, and that it differs from the soft one.
         */
        it('calls the /hard endpoint with the user id', () =>
            useUsersStore()
                .hardDeleteUser('u1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/users/u1/hard',
                        method: 'DELETE'
                    });
                }));

        it('is a different URL from the soft delete', () =>
            useUsersStore()
                .deleteUser('u1')
                .then(() => {
                    const soft = lastRequest()?.url;
                    return useUsersStore()
                        .hardDeleteUser('u1')
                        .then(() => {
                            expect(lastRequest()?.url).not.toBe(soft);
                        });
                }));
    });

    /**
     * Read paths — same rationale as the products store: the toolkit's pagination and caching
     * are not re-tested, but the request each wrapper builds and the envelope depth it unwraps
     * are this repo's logic. Unlike products, `watchSearchUsers` passes `id` through unrenamed,
     * which is asserted explicitly so the two stores' differing conventions stay deliberate
     * rather than becoming an accident someone "fixes" in one place.
     */
    describe('read paths', () => {
        const USER = { id: 'u1', username: 'ada', email: 'ada@example.com' };

        it('fetchUsers requests the collection and unwraps the paginated envelope', () => {
            respondWithItems([USER]);

            return useUsersStore()
                .fetchUsers()
                .then((result) => {
                    expect(lastRequest()).toMatchObject({ url: '/users', method: 'GET' });
                    expect(result).toEqual([USER]);
                });
        });

        it('fetchPaginationUsers defaults to the first page of ten', () => {
            respondWithItems([]);

            return useUsersStore()
                .fetchPaginationUsers()
                .then(() => {
                    // A paged read IS a search with no filters, so it rides the search route.
                    expect(lastRequest()).toMatchObject({
                        url: '/users/search',
                        method: 'POST',
                        data: { page: 1, pageSize: 10 }
                    });
                });
        });

        it('fetchPaginationUsers passes an explicit page and size through', () => {
            respondWithItems([]);

            return useUsersStore()
                .fetchPaginationUsers(2, 50)
                .then(() => {
                    expect(lastRequest()).toMatchObject({ data: { page: 2, pageSize: 50 } });
                });
        });

        it('fetchUser requests one user and unwraps a single-record envelope', () => {
            vi.mocked(orvalMutator).mockResolvedValue({ data: USER });

            return useUsersStore()
                .fetchUser('u1')
                .then((result) => {
                    expect(lastRequest()).toMatchObject({ url: '/users/u1', method: 'GET' });
                    expect(result).toEqual(USER);
                });
        });

        it('watchSearchUsers posts every supported filter to /users/search', () => {
            respondWithItems([]);
            const store = useUsersStore();
            store.filters = {
                text: 'ada',
                id: 'u1',
                email: 'ada@example.com',
                username: 'ada',
                active: true
            };

            return store
                .watchSearchUsers()
                .search()
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/users/search', method: 'POST' });
                    expect(lastBody()).toMatchObject({
                        text: 'ada',
                        // Passed through under its own name here — contrast with the products
                        // store, where the same field is sent as `productId`.
                        id: 'u1',
                        email: 'ada@example.com',
                        username: 'ada',
                        active: true
                    });
                });
        });

        it('watchSearchUsers keeps active:false distinct from "no filter"', () => {
            // A truthiness check on `active` would drop `false` and silently return active AND
            // inactive users when an admin asked for inactive ones only.
            respondWithItems([]);
            const store = useUsersStore();
            store.filters = { active: false };

            return store
                .watchSearchUsers()
                .search()
                .then(() => {
                    expect(lastBody().active).toBe(false);
                });
        });

        it('watchSearchUsers reports a failed search to the supplied error handler', () => {
            const failure = new Error('network down');
            vi.mocked(orvalMutator).mockRejectedValue(failure);
            const onError = vi.fn();

            return useUsersStore()
                .watchSearchUsers({ onError })
                .search()
                .catch(() => {})
                .then(() => {
                    expect(onError).toHaveBeenCalledWith(failure, expect.anything());
                });
        });
    });
});
