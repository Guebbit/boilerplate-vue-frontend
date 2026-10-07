/**
 * @module
 * The guest cart's copy in `localStorage`: what a round trip keeps, what it refuses to trust, and
 * that storage being blocked or full never turns into an error the visitor sees.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    GUEST_CART_STORAGE_KEY,
    GUEST_MERGE_ATTEMPT_STORAGE_KEY,
    readGuestCart,
    readMergeAttempt,
    writeGuestCart,
    writeMergeAttempt
} from '../composables/guest-cart-storage';

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('readGuestCart', () => {
    it('reads what writeGuestCart saved', () => {
        const lines = [
            { productId: 'p1', quantity: 2 },
            { productId: 'p2', quantity: 1 }
        ];
        writeGuestCart(lines);

        expect(readGuestCart()).toEqual(lines);
    });

    it('is empty when nothing was ever saved', () => {
        expect(readGuestCart()).toEqual([]);
    });

    it('is empty, not an error, when the saved value is not JSON', () => {
        localStorage.setItem(GUEST_CART_STORAGE_KEY, '{not json');

        expect(readGuestCart()).toEqual([]);
    });

    it('keeps the valid lines of a value somebody edited', () => {
        localStorage.setItem(
            GUEST_CART_STORAGE_KEY,
            JSON.stringify([{ productId: 'p1', quantity: 2 }, { productId: 'p2' }, 'junk'])
        );

        expect(readGuestCart()).toEqual([{ productId: 'p1', quantity: 2 }]);
    });

    it('is empty, not an error, when the browser blocks storage', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });

        expect(readGuestCart()).toEqual([]);
    });
});

describe('writeGuestCart', () => {
    it('saves under the one key', () => {
        writeGuestCart([{ productId: 'p1', quantity: 2 }]);

        expect(JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? 'null')).toEqual([
            { productId: 'p1', quantity: 2 }
        ]);
    });

    it('removes the key for an empty cart instead of leaving an empty list behind', () => {
        writeGuestCart([{ productId: 'p1', quantity: 2 }]);

        writeGuestCart([]);

        expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
    });

    it('does not throw when the browser refuses the write', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });

        expect(() => writeGuestCart([{ productId: 'p1', quantity: 2 }])).not.toThrow();
    });

    it('does not throw when the browser refuses the removal', () => {
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });

        expect(() => writeGuestCart([])).not.toThrow();
    });
});

describe('the pending merge attempt', () => {
    it('reads what writeMergeAttempt saved, and nothing once it is cleared', () => {
        writeMergeAttempt({ key: 'k1', body: '[]' });

        expect(readMergeAttempt()).toEqual({ key: 'k1', body: '[]' });

        writeMergeAttempt(undefined);

        expect(readMergeAttempt()).toBeUndefined();
        expect(localStorage.getItem(GUEST_MERGE_ATTEMPT_STORAGE_KEY)).toBeNull();
    });

    it.each([
        ['not JSON', '{nope'],
        ['not an object', '7'],
        ['null', 'null'],
        ['missing the body', JSON.stringify({ key: 'k1' })],
        ['a key that is not text', JSON.stringify({ key: 4, body: '[]' })]
    ])('reads as no attempt when the saved value is %s', (_label, raw) => {
        localStorage.setItem(GUEST_MERGE_ATTEMPT_STORAGE_KEY, raw);

        expect(readMergeAttempt()).toBeUndefined();
    });

    it('never throws when the browser refuses to read, write or remove it', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError');
        });

        expect(readMergeAttempt()).toBeUndefined();
        expect(() => writeMergeAttempt({ key: 'k1', body: '[]' })).not.toThrow();
        expect(() => writeMergeAttempt(undefined)).not.toThrow();
    });
});

describe('a saved guest cart that is not a list', () => {
    it.each([
        ['null', 'null'],
        ['a number', '7'],
        ['a string', '"p1"'],
        ['one line, not a list of lines', JSON.stringify({ productId: 'p1', quantity: 1 })]
    ])('reads as empty when it is %s', (_label, raw) => {
        localStorage.setItem(GUEST_CART_STORAGE_KEY, raw);

        expect(readGuestCart()).toEqual([]);
    });
});
