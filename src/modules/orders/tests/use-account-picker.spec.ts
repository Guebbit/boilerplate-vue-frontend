/**
 * @module
 * The account picker's search: what request a typed text makes, how a found user reads in the
 * list, and that a keystroke burst costs one request. `@api` is mocked at the client call, so the
 * request the composable builds is what is asserted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchUsers } from '@api';
import { aUser } from '../../../../tests/support/unit/fixtures.ts';
import { useAccountPicker } from '../composables/use-account-picker.ts';

vi.mock('@api', () => ({
    searchUsers: vi.fn()
}));

/** A page answer carrying the given users. */
const pageOf = (users: ReturnType<typeof aUser>[]) =>
    Promise.resolve({
        items: users,
        meta: { page: 1, pageSize: 20, totalItems: users.length, totalPages: 1 }
    });

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useAccountPicker', () => {
    it('searches nothing until it is asked to', async () => {
        useAccountPicker();

        await vi.runAllTimersAsync();

        expect(searchUsers).not.toHaveBeenCalled();
    });

    it('searches the typed text with the picker page size, and lists "username (email)"', async () => {
        vi.mocked(searchUsers).mockReturnValue(
            pageOf([aUser({ id: 'u7', username: 'ada', email: 'ada@example.com' })])
        );
        const { search, options, query } = useAccountPicker();

        search('ada');
        await vi.runAllTimersAsync();

        expect(searchUsers).toHaveBeenCalledExactlyOnceWith({ text: 'ada', pageSize: 20 });
        expect(query.value).toBe('ada');
        expect(options.value).toEqual([{ value: 'u7', title: 'ada (ada@example.com)' }]);
    });

    it('sends an emptied box as no text at all, and one request for a burst of keys', async () => {
        vi.mocked(searchUsers).mockReturnValue(pageOf([]));
        const { search } = useAccountPicker();

        search('a');
        search('ad');
        search('');
        await vi.runAllTimersAsync();

        expect(searchUsers).toHaveBeenCalledExactlyOnceWith({ text: undefined, pageSize: 20 });
    });

    it('keeps the previous options when a search fails', async () => {
        vi.mocked(searchUsers)
            .mockReturnValueOnce(pageOf([aUser({ id: 'u1', username: 'bo', email: 'b@e.com' })]))
            .mockRejectedValueOnce(new Error('offline'));
        const { search, options } = useAccountPicker();

        search('b');
        await vi.runAllTimersAsync();
        search('bo');
        await vi.runAllTimersAsync();

        expect(options.value).toEqual([{ value: 'u1', title: 'bo (b@e.com)' }]);
    });
});
