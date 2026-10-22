/**
 * @module
 * `safe-storage.ts` — JSON round trip through Web Storage, and "nothing saved" (never a throw)
 * for damaged text and for blocked storage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    parseJsonSafe,
    readJson,
    removeByPrefix,
    writeJson
} from '@/infrastructure/utils/safe-storage.ts';

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('safe-storage', () => {
    it('round-trips a value in the chosen area only', () => {
        writeJson('session', 'k', { a: 1 });
        expect(readJson('session', 'k')).toEqual({ a: 1 });
        expect(readJson('local', 'k')).toBeUndefined();
    });

    it('removes the key when the value is undefined', () => {
        writeJson('local', 'k', 1);
        writeJson('local', 'k');
        expect(localStorage.getItem('k')).toBeNull();
    });

    it('reads damaged text as nothing saved', () => {
        localStorage.setItem('k', '{nope');
        expect(readJson('local', 'k')).toBeUndefined();
        expect(parseJsonSafe('{nope')).toBeUndefined();
    });

    it('swallows blocked storage on read and write', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('full');
        });
        expect(readJson('local', 'k')).toBeUndefined();
        expect(() => {
            writeJson('local', 'k', 1);
        }).not.toThrow();
    });

    it('removes only keys with the prefix', () => {
        sessionStorage.setItem('draft:1', '1');
        sessionStorage.setItem('other', '2');
        removeByPrefix('session', 'draft:');
        expect(sessionStorage.getItem('draft:1')).toBeNull();
        expect(sessionStorage.getItem('other')).toBe('2');
    });
});
