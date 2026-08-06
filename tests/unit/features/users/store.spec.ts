/**
 * Unit tests for the users store.
 *
 * Same shape as the products store, including why `@api` is not mocked — see the header there:
 * the multipart encoding lives in the generated client, so the transport is mocked instead and
 * the assertions are about the request that actually goes out.
 *
 * One extra thing is asserted here that has no products equivalent: `updateUser` receives a
 * password, and a password must not end up parked in client-side store state.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useUsersStore } from '@/features/users/store';
import { orvalMutator } from '@/plugins/http';

vi.mock('@/plugins/http', () => ({
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
    vi.mocked(orvalMutator).mockResolvedValue({ data: { items } } as never);

describe('useUsersStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('createUser', () => {
        it('posts JSON when no avatar is attached', async () => {
            const store = useUsersStore();
            await store.createUser({
                email: 'ada@example.com',
                username: 'ada',
                password: 'password123'
            });

            const request = lastRequest();
            expect(request).toMatchObject({ url: '/users', method: 'POST' });
            expect(request.data).not.toBeInstanceOf(FormData);
            expect(request.data).toMatchObject({ email: 'ada@example.com', username: 'ada' });
        });

        it('posts multipart to /users when an avatar is attached', async () => {
            const store = useUsersStore();
            await store.createUser({
                email: 'ada@example.com',
                username: 'ada',
                password: 'password123',
                imageUpload: new Blob(['x'])
            });

            expect(lastRequest()).toMatchObject({ url: '/users', method: 'POST' });
            expect(lastFormData().get('email')).toBe('ada@example.com');
        });

        it('sends a Blob avatar, not only a File', async () => {
            // toFormData, which this store used to call, recursed into anything that was not a
            // File and silently dropped a plain Blob. The contract types the field as Blob.
            const store = useUsersStore();
            await store.createUser({
                email: 'ada@example.com',
                username: 'ada',
                password: 'password123',
                imageUpload: new Blob(['x'])
            });

            expect(lastFormData().get('imageUpload')).toBeInstanceOf(Blob);
        });

        it('omits unset optional fields instead of sending the string "undefined"', async () => {
            const store = useUsersStore();
            await store.createUser({
                email: 'ada@example.com',
                username: 'ada',
                password: 'password123',
                admin: undefined,
                imageUpload: new Blob(['x'])
            });

            const formData = lastFormData();
            expect(formData.has('admin')).toBe(false);
            expect([...formData.values()]).not.toContain('undefined');
        });
    });

    describe('updateUser', () => {
        it('puts JSON when no new avatar is attached', async () => {
            const store = useUsersStore();
            await store.updateUser('u1', { username: 'ada2' });

            const request = lastRequest();
            expect(request).toMatchObject({ url: '/users/u1', method: 'PUT' });
            expect(request.data).not.toBeInstanceOf(FormData);
            expect(request.data).toMatchObject({ username: 'ada2' });
        });

        it('puts multipart when an avatar is attached', async () => {
            const store = useUsersStore();
            await store.updateUser('u1', { username: 'ada2', imageUpload: new Blob(['x']) });

            expect(lastRequest()).toMatchObject({ url: '/users/u1', method: 'PUT' });
            expect(lastFormData().get('username')).toBe('ada2');
        });

        it('never parks the submitted password in store state', async () => {
            const store = useUsersStore();
            store.addUser({ id: 'u1', username: 'ada', email: 'ada@example.com' });

            await store.updateUser('u1', { username: 'ada2', password: 'hunter2hunter2' });

            expect(JSON.stringify(store.users)).not.toContain('hunter2hunter2');
        });

        it('never parks the uploaded Blob in store state', async () => {
            const store = useUsersStore();
            store.addUser({ id: 'u1', username: 'ada', email: 'ada@example.com' });

            await store.updateUser('u1', { username: 'ada2', imageUpload: new Blob(['x']) });

            expect(store.users.u1).not.toHaveProperty('imageUpload');
        });
    });

    describe('updateUserImage', () => {
        it('rejects without calling the API when no file is selected', async () => {
            const store = useUsersStore();

            await expect(store.updateUserImage('u1', [])).rejects.toThrow('no file selected');
            expect(orvalMutator).not.toHaveBeenCalled();
        });

        it('sends only the file, letting the API return the new imageUrl', async () => {
            const store = useUsersStore();
            const file = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });

            await store.updateUserImage('u1', [file]);

            const formData = lastFormData();
            expect([...formData.keys()]).toEqual(['imageUpload']);
            expect(formData.get('imageUpload')).toBeInstanceOf(File);
        });

        it('forwards the upload progress callback to the transport', async () => {
            const store = useUsersStore();
            const file = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });
            const onUploadProgress = vi.fn();

            await store.updateUserImage('u1', [file], onUploadProgress);

            // Second argument: orval passes the caller's `options` through to the mutator.
            expect(orvalMutator).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ onUploadProgress })
            );
        });
    });

    describe('deleteUser', () => {
        it('calls the delete endpoint with the user id', async () => {
            const store = useUsersStore();
            await store.deleteUser('u1');

            expect(lastRequest()).toMatchObject({ url: '/users/u1', method: 'DELETE' });
        });
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

        it('fetchUsers requests the collection and unwraps the paginated envelope', async () => {
            respondWithItems([USER]);
            const store = useUsersStore();

            const result = await store.fetchUsers();

            expect(lastRequest()).toMatchObject({ url: '/users', method: 'GET' });
            expect(result).toEqual([USER]);
        });

        it('fetchPaginationUsers defaults to the first page of ten', async () => {
            respondWithItems([]);
            const store = useUsersStore();

            await store.fetchPaginationUsers();

            expect(lastRequest()).toMatchObject({
                url: '/users',
                method: 'GET',
                params: { page: 1, pageSize: 10 }
            });
        });

        it('fetchPaginationUsers passes an explicit page and size through', async () => {
            respondWithItems([]);
            const store = useUsersStore();

            await store.fetchPaginationUsers(2, 50);

            expect(lastRequest()).toMatchObject({ params: { page: 2, pageSize: 50 } });
        });

        it('fetchUser requests one user and unwraps a single-record envelope', async () => {
            vi.mocked(orvalMutator).mockResolvedValue({ data: USER } as never);
            const store = useUsersStore();

            const result = await store.fetchUser('u1');

            expect(lastRequest()).toMatchObject({ url: '/users/u1', method: 'GET' });
            expect(result).toEqual(USER);
        });

        it('watchSearchUsers sends every supported filter as a query parameter', async () => {
            respondWithItems([]);
            const store = useUsersStore();
            store.filters = {
                text: 'ada',
                id: 'u1',
                email: 'ada@example.com',
                username: 'ada',
                active: true
            };

            const handle = store.watchSearchUsers();
            await handle.search();

            const { params } = lastRequest() as unknown as { params: Record<string, unknown> };
            expect(params).toMatchObject({
                text: 'ada',
                // Passed through under its own name here — contrast with the products store,
                // where the same field is sent as `productId`.
                id: 'u1',
                email: 'ada@example.com',
                username: 'ada',
                active: true
            });
        });

        it('watchSearchUsers keeps active:false distinct from "no filter"', async () => {
            // A truthiness check on `active` would drop `false` and silently return active AND
            // inactive users when an admin asked for inactive ones only.
            respondWithItems([]);
            const store = useUsersStore();
            store.filters = { active: false };

            const handle = store.watchSearchUsers();
            await handle.search();

            const { params } = lastRequest() as unknown as { params: Record<string, unknown> };
            expect(params.active).toBe(false);
        });

        it('watchSearchUsers reports a failed search to the supplied error handler', async () => {
            const failure = new Error('network down');
            vi.mocked(orvalMutator).mockRejectedValue(failure);
            const store = useUsersStore();
            const onError = vi.fn();

            const handle = store.watchSearchUsers(onError);
            await handle.search().catch(() => {});

            expect(onError).toHaveBeenCalledWith(failure);
        });
    });
});
