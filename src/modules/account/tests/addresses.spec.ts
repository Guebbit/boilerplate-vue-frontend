/**
 * @module
 * Unit tests for the address-book store, mocking only the transport (`orvalMutator`) so the
 * store's own fetch-after-write logic runs for real.
 *
 * All four endpoints answer with the WHOLE book rather than the row that changed, so each case
 * pins the same invariant: exactly one default, and the local list replaced by the answer rather
 * than patched. `removeAddress` matters most — deleting the default promotes the oldest survivor
 * server-side, so a store that removed the row locally would show no default until reload.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAddressesStore } from '@/modules/account/stores/addresses.ts';
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
            parseOrvalFixture(config.method, config.url, orvalEnvelope({ addresses: [] }))
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
 * Makes the transport answer the book's own endpoints (read, delete) with this book, and a write
 * to one entry with that entry alone — what the contract says each answers. Every answer is
 * proven against the operation's schema by `parseOrvalFixture`.
 *
 * @param addresses - the book as the server holds it after the write
 * @param written - the entry a create, PUT or PATCH answers with
 */
const respondWithBook = (addresses: unknown[], written?: unknown) =>
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        const answersOneEntry = config.method !== 'GET' && config.method !== 'DELETE';
        return Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                answersOneEntry ? orvalEnvelope(written) : orvalEnvelope({ addresses })
            )
        );
    });

/**
 * The `METHOD url` of every request the transport has seen, in order.
 */
const requestLog = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => {
        const { method, url } = call[0] as { method: string; url: string };
        return `${method} ${url}`;
    });

describe('useAddressesStore', () => {
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
        expect(useAddressesStore().addresses).toEqual([]);
    });

    it('fetches the book and stores it', () => {
        respondWithBook([HOME, WORK]);
        const store = useAddressesStore();

        return store.fetchAddresses().then((result) => {
            expect(lastRequest()).toMatchObject({ url: '/account/addresses', method: 'GET' });
            expect(store.addresses).toEqual([HOME, WORK]);
            expect(result).toEqual([HOME, WORK]);
        });
    });

    // A create answers the entry it made (201), which says nothing of a demoted default — so the
    // store re-reads the book and renders THAT.
    it('posts a new entry, then reloads the book rather than trusting the one row it got back', () => {
        respondWithBook([HOME, WORK], WORK);
        const store = useAddressesStore();

        const { id: _id, default: _default, ...input } = WORK;

        return store.addAddress(input).then(() => {
            expect(requestLog()).toEqual(['POST /account/addresses', 'GET /account/addresses']);
            expect(store.addresses).toEqual([HOME, WORK]);
        });
    });

    it('patches a change to one entry, addressed by id, then reloads the book', () => {
        const changed = { ...HOME, city: 'Ogdenville' };
        respondWithBook([changed], changed);
        const store = useAddressesStore();

        return store.updateAddress('a1', { city: 'Ogdenville' }).then(() => {
            expect(requestLog()).toEqual(['PATCH /account/addresses/a1', 'GET /account/addresses']);
            expect(store.addresses).toEqual([changed]);
        });
    });

    // The default is the book's pointer: an action of its own, and the demoted holder is another
    // row, which only the reload shows.
    it('makes an entry the default through its own action, then reloads the book', () => {
        respondWithBook(
            [
                { ...HOME, default: false },
                { ...WORK, default: true }
            ],
            {
                ...WORK,
                default: true
            }
        );
        const store = useAddressesStore();

        return store.setDefaultAddress('a2').then(() => {
            expect(requestLog()).toEqual([
                'PUT /account/addresses/a2/default',
                'GET /account/addresses'
            ]);
            expect(store.addresses).toEqual([
                { ...HOME, default: false },
                { ...WORK, default: true }
            ]);
        });
    });

    it('deletes an entry and takes the promoted default from the answer', () => {
        const store = useAddressesStore();
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
        // an undefined here is a render crash rather than an empty state. `addresses` is required
        // by the real contract, so this specific payload is impossible against it — it bypasses
        // `parseOrvalFixture` on purpose to pin the store's OWN defence for that state.
        vi.mocked(orvalMutator).mockImplementationOnce(() =>
            Promise.resolve({ success: true, status: 200, message: 'OK', data: {} })
        );
        const store = useAddressesStore();

        return store.fetchAddresses().then((result) => {
            expect(result).toEqual([]);
            expect(store.addresses).toEqual([]);
        });
    });
});
