/**
 * @module
 * Unit tests for the users store, mocking `orvalMutator` directly (the multipart encoding lives
 * in the generated client) and inspecting the raw requests sent by the store's actions. Same
 * shape as the products store, including why `@api` is not mocked — the multipart encoding lives
 * in the generated client, so the transport is mocked instead.
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
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({
    // A delete answers with no `data` at all — every OTHER write here answers with the record —
    // so the method picks which envelope shape this default resolves.
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.method?.toUpperCase() === 'DELETE'
                    ? orvalEnvelope()
                    : orvalEnvelope({ id: 'u1', username: 'ada', email: 'ada@example.com' })
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
 * As above, asserting the body was multipart-encoded.
 */
const lastFormData = () => {
    const { data } = lastRequest();
    if (!(data instanceof FormData)) throw new Error('last request body was not FormData');
    return data;
};

/**
 * Makes the transport answer with a paginated envelope for this test. `meta` matches the real
 * `PaginationMeta` shape — `search:` (`store.ts`) reads `meta.totalPages` for `pageTotal`, so an
 * envelope without one no longer represents a real response.
 */
const respondWithItems = (items: unknown[]) =>
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                orvalEnvelope({
                    items,
                    meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }
                })
            )
        )
    );

/**
 * The query parameters of the most recent request.
 */
/**
 * The JSON body of the most recent request — what `POST /users/search` reads.
 */
const lastBody = () => asStub<{ data: Record<string, unknown> }>(lastRequest()).data;

/**
 * Number of GET requests sent so far — used to prove `adminDisableTwoFactor` bypasses the
 * toolkit's target cache (`staleTime`, one hour) instead of handing back a stale, still-enabled
 * record.
 */
const getRequestCount = () =>
    vi.mocked(orvalMutator).mock.calls.filter(([config]) => config.method === 'GET').length;

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
                    password: 'Password123!'
                })
                .then(() => {
                    const request = lastRequest();
                    expect(request).toMatchObject({ url: '/users', method: 'POST' });
                    expect(request.data).not.toBeInstanceOf(FormData);
                    expect(contractRequest(schemas.CreateUserBody, request.data)).toMatchObject({
                        email: 'ada@example.com',
                        username: 'ada'
                    });
                }));

        it('posts multipart to /users when an avatar is attached', () =>
            useUsersStore()
                .createUser({
                    email: 'ada@example.com',
                    username: 'ada',
                    password: 'Password123!',
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
                    password: 'Password123!',
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
                    password: 'Password123!',
                    role: undefined,
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    const formData = lastFormData();
                    expect(formData.has('role')).toBe(false);
                    expect([...formData.values()]).not.toContain('undefined');
                }));
    });

    describe('updateUser', () => {
        // PATCH, not PUT — `UserEdit.vue` sends only the fields its form holds,
        // and a PUT would clear every field it omits (RFC 9110 §9.3.4).
        it('patches JSON when no new avatar is attached', () =>
            useUsersStore()
                .updateUser('u1', { username: 'ada2' })
                .then(() => {
                    const request = lastRequest();
                    expect(request).toMatchObject({ url: '/users/u1', method: 'PATCH' });
                    expect(request.data).not.toBeInstanceOf(FormData);
                    expect(contractRequest(schemas.UpdateUserByIdBody, request.data)).toMatchObject(
                        {
                            username: 'ada2'
                        }
                    );
                }));

        it('patches multipart when an avatar is attached', () =>
            useUsersStore()
                .updateUser('u1', { username: 'ada2', imageUpload: new Blob(['x']) })
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/users/u1', method: 'PATCH' });
                    expect(lastFormData().get('username')).toBe('ada2');
                }));

        /**
         * A multipart part cannot carry `null`, so a clear that shares a save with an avatar
         * travels as its own JSON PATCH, after the upload.
         */
        it('sends a clear that shares a save with an avatar as a second, JSON PATCH', () =>
            useUsersStore()
                .updateUser('u1', {
                    username: 'ada2',
                    phone: null,
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    const [upload, clear] = vi
                        .mocked(orvalMutator)
                        .mock.calls.slice(-2)
                        .map(([config]) => config);
                    expect(upload.data).toBeInstanceOf(FormData);
                    expect((upload.data as FormData).has('phone')).toBe(false);
                    expect(clear).toMatchObject({ url: '/users/u1', method: 'PATCH' });
                    expect(contractRequest(schemas.UpdateUserByIdBody, clear.data)).toEqual({
                        phone: null
                    });
                }));

        it('sends only the upload when nothing is being cleared', () =>
            useUsersStore()
                .updateUser('u1', { username: 'ada2', imageUpload: new Blob(['x']) })
                .then(() => {
                    expect(vi.mocked(orvalMutator)).toHaveBeenCalledTimes(1);
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
         * The same rule `products/store.ts` already enforces for its own `imageUrl`: the LOCAL
         * `User` never holds a `null` image, only a real value or absence, so an in-flight clear
         * must not null out the cached one ahead of the response that actually confirms it.
         */
        it('leaves a cached imageUrl alone while a clearing update is in flight', () => {
            const store = useUsersStore();
            store.addUser({
                id: 'u1',
                username: 'ada',
                email: 'ada@example.com',
                imageUrl: 'https://cdn.example.com/avatars/ada.png'
            });

            // `Once`, deliberately: the suite's `beforeEach` calls `vi.clearAllMocks()`, which
            // clears recorded calls but NOT an implementation set with `mockReturnValue`. A
            // persistent override here would hand every later test this same settled promise.
            let release!: (value: unknown) => void;
            const transportResponse = new Promise((resolve) => {
                release = resolve;
            });
            vi.mocked(orvalMutator).mockImplementationOnce(
                (config: { url?: string; method?: string }) =>
                    transportResponse.then((data) =>
                        parseOrvalFixture(config.method, config.url, data)
                    )
            );

            const pending = store.updateUser('u1', { username: 'ada2', imageUrl: null });

            return vi
                .waitFor(() => {
                    expect(store.users.u1.username).toBe('ada2');
                })
                .then(() => {
                    expect(store.users.u1.imageUrl).toBe('https://cdn.example.com/avatars/ada.png');
                    // The read shape never answers `null` for `imageUrl` today — a cleared field
                    // still resolves to the default placeholder URL until Step 1b's "null clears"
                    // read-shape change lands. What this test pins is the OPTIMISTIC guess, not
                    // this response value.
                    release(
                        orvalEnvelope({
                            id: 'u1',
                            username: 'ada2',
                            email: 'ada@example.com',
                            imageUrl: 'https://cdn.example.com/avatars/default.png'
                        })
                    );
                    return pending;
                });
        });

        /**
         * The reason `orvalMutator` takes a second argument at all — `UserEdit.vue` passes
         * `onUploadProgress` through `updateOne`'s `requestOptions` to drive its progress bar.
         */
        it('forwards the upload progress callback to the transport', () => {
            const onUploadProgress = vi.fn();

            return useUsersStore()
                .updateUser(
                    'u1',
                    { username: 'ada2', imageUpload: new Blob(['x']) },
                    { requestOptions: { onUploadProgress } }
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

    describe('restoreUser', () => {
        // Its own endpoint: DELETE is one-way on the API, so a second delete never restores.
        it('posts to the restore endpoint', () =>
            useUsersStore()
                .restoreUser('u1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/users/u1/restore',
                        method: 'POST'
                    });
                }));
    });

    describe('hardDeleteUser', () => {
        /*
         * A separate method rather than a flag on `deleteUser`, because the two are not the same
         * operation: the soft form sets `deletedAt` and an admin can restore it, this one is
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

    describe('adminDisableTwoFactor', () => {
        it('force-refetches the user instead of reusing the page-load cache entry', () => {
            const store = useUsersStore();

            // Primes the cache the same way `User.vue`'s `watchUser` does on mount.
            return store.fetchUser('u1').then(() => {
                const before = getRequestCount();
                return store.adminDisableTwoFactor('u1').then(() => {
                    expect(getRequestCount()).toBeGreaterThan(before);
                });
            });
        });

        it('calls the 2fa endpoint with the user id', () =>
            useUsersStore()
                .adminDisableTwoFactor('u1')
                .then(() => {
                    // Two requests happen (the DELETE, then the forced re-fetch); the DELETE is
                    // the one this test cares about naming the right resource.
                    const deleteCall = vi
                        .mocked(orvalMutator)
                        .mock.calls.find(([config]) => config.method === 'DELETE');
                    expect(deleteCall?.[0]).toMatchObject({
                        url: '/users/u1/2fa',
                        method: 'DELETE'
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
                    expect(
                        contractRequest(schemas.SearchUsersBody, lastRequest().data)
                    ).toBeDefined();
                });
        });

        it('fetchPaginationUsers passes an explicit page and size through', () => {
            respondWithItems([]);

            return useUsersStore()
                .fetchPaginationUsers(2, 50)
                .then(() => {
                    expect(lastRequest()).toMatchObject({ data: { page: 2, pageSize: 50 } });
                    expect(
                        contractRequest(schemas.SearchUsersBody, lastRequest().data)
                    ).toBeDefined();
                });
        });

        it('fetchUser requests one user and unwraps a single-record envelope', () => {
            vi.mocked(orvalMutator).mockImplementation(
                (config: { url?: string; method?: string }) =>
                    Promise.resolve(
                        parseOrvalFixture(config.method, config.url, orvalEnvelope(USER))
                    )
            );

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
                        // store, where the same field is sent as `productId`. The filter box
                        // searches for one id; the API reads a batch.
                        id: ['u1'],
                        email: 'ada@example.com',
                        username: 'ada',
                        active: true
                    });
                });
        });

        it('watchSearchUsers sends a sort the contract names, and drops one it does not', () => {
            respondWithItems([]);
            const store = useUsersStore();
            store.filters = { sort: '-email' };

            return store
                .watchSearchUsers()
                .search()
                .then(() => {
                    expect(lastBody().sort).toEqual(['-email']);
                    store.filters = { sort: 'password' };
                    return store.watchSearchUsers().search(true);
                })
                .then(() => {
                    expect(lastBody().sort).toBeUndefined();
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
