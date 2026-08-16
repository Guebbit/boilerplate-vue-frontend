/**
 * BEHAVIOUR parity for users's mock handlers — that they apply the same filtering, scoping and
 * pagination rules as the backend services they mirror.
 *
 * `docs/tools/mocking.md` states this alongside DATA parity, which is structural: both repos read
 * a byte-identical `dataset.json`. Behaviour has no such mechanism. Without these cases the
 * rules in this module's `mocks/handlers.ts` are asserted only indirectly, through Cypress, against
 * data chosen to make specs readable rather than to probe the rules — so a handler can drift from
 * the service it mirrors and every spec stays green.
 *
 * These are NOT a second copy of the backend's suite. The backend proves its own behaviour
 * thoroughly; each case here is shaped after its counterpart and names it, so that asserting THE
 * MOCK answers the same question the same way is a one-line comparison for whoever changes either
 * side.
 *
 * Cases sit where the two implementations can plausibly disagree, not where coverage is thin: the
 * mock filters an in-memory array in JavaScript while the API builds a Mongo query, so
 * combinations (`active` × `deletedAt` × role) and arithmetic boundaries are the risk, not the
 * happy path a spec already walks.
 *
 * Lives beside the module rather than in a central parity file: these assertions are about this
 * domain and nothing else, so `rm -rf` of the folder should take them along. See
 * `docs/theory/modules.md`.
 */
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@types';
import { registerUsersMockHandlers } from '@/modules/users/mocks/handlers';
import { mockDatabase } from '@mocks/mockShared.ts';
import { mockDatabaseReady } from '../../../../tests/support/unit/mockDatabaseReady.ts';
import {
    API,
    idsOf,
    makeUser,
    resetMockDatabaseForParity,
    signIn
} from '../../../../tests/support/unit/mockHandlerHarness.ts';

const server = setupServer(...registerUsersMockHandlers());

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    // Gives every enabled domain's collection a real (empty) array on `mockDatabase`, which
    // `resetMockDatabaseForParity` then clears generically. Called here rather than in the global
    // setup file — see `tests/support/unit/mockDatabaseReady.ts`.
    return mockDatabaseReady();
});
afterAll(() => {
    server.close();
});

beforeEach(() => {
    resetMockDatabaseForParity();
});

afterEach(() => {
    server.resetHandlers();
});

const listUsers = (query = '') =>
    fetch(`${API}/users${query}`).then(
        (response) => response.json() as Promise<{ data: { items: User[] } }>
    );

describe('user active filter', () => {
    // Backend counterpart: tests/unit/services/users.test.ts — "filters on the active column,
    // not on soft-deletion". `active` is a real stored column on both sides; deriving it from
    // `deletedAt` on either would make this filter mean something different per side.

    beforeEach(() => {
        signIn(true);
        mockDatabase.sampleUsers = [
            makeUser({ id: 'enabled', email: 'enabled@example.com', active: true }),
            makeUser({ id: 'disabled', email: 'disabled@example.com', active: false })
        ];
    });

    it('returns only enabled accounts for active=true', async () => {
        const { data } = await listUsers('?active=true');

        expect(idsOf(data.items)).toEqual(['enabled']);
    });

    it('returns only disabled accounts for active=false', async () => {
        const { data } = await listUsers('?active=false');

        // `?active=false` arrives as the STRING 'false', which is truthy. A handler that read it
        // with a bare `Boolean(...)` would answer this with the enabled account instead — the
        // same class of bug the backend shipped on `?hardDelete=false`.
        expect(idsOf(data.items)).toEqual(['disabled']);
    });

    it('returns every account when the filter is absent', async () => {
        const { data } = await listUsers();

        expect(idsOf(data.items).toSorted()).toEqual(['disabled', 'enabled']);
    });
});
