/**
 * @module
 * Web Storage and `JSON.parse` both throw (blocked storage, full quota, damaged text). Every
 * caller treats a throw as "nothing saved", so the `try/catch` lives here once and the helpers
 * return `undefined` / do nothing instead.
 */

/**
 * Which Web Storage area to use. Resolved lazily, because even touching `localStorage` can throw.
 */
export type StorageKind = 'local' | 'session';

/**
 * Resolves the storage area. Throws when the browser blocks storage.
 *
 * @param kind - Which area.
 * @returns The `Storage` object.
 */
const area = (kind: StorageKind): Storage => (kind === 'local' ? localStorage : sessionStorage);

/**
 * Parses JSON text.
 *
 * @param raw - The text.
 * @returns The parsed value, or `undefined` when it is not JSON.
 */
export const parseJsonSafe = (raw: string): unknown => {
    // eslint-disable-next-line no-restricted-syntax -- JSON.parse has no non-throwing form; text that is not JSON means "nothing usable", never a failure
    try {
        // `JSON.parse` returns `any`; callers treat the value as `unknown` and validate it.
        return JSON.parse(raw) as unknown;
    } catch {
        return undefined;
    }
};

/**
 * Reads one key and parses it as JSON.
 *
 * @param kind - Which storage area.
 * @param key - The storage key.
 * @returns The parsed value, or `undefined` when nothing is saved, the value is not JSON, or
 *  storage is unavailable.
 */
export const readJson = (kind: StorageKind, key: string): unknown => {
    // eslint-disable-next-line no-restricted-syntax -- Web Storage throws when blocked; that means "nothing saved", never a failure
    try {
        const raw = area(kind).getItem(key);
        return raw === null ? undefined : parseJsonSafe(raw);
    } catch {
        return undefined;
    }
};

/**
 * Saves a value under a key as JSON, or removes the key when there is no value. Failures are
 * swallowed on purpose: the data is a convenience copy, the app works from memory either way.
 *
 * @param kind - Which storage area.
 * @param key - The storage key.
 * @param value - What to keep; `undefined` removes the key.
 */
export const writeJson = (kind: StorageKind, key: string, value?: unknown): void => {
    // eslint-disable-next-line no-restricted-syntax -- Web Storage throws when blocked or full; the data is kept in memory either way, so losing the copy costs the next visit, not this one
    try {
        if (value === undefined) area(kind).removeItem(key);
        else area(kind).setItem(key, JSON.stringify(value));
    } catch {
        // Nothing to report to: the app keeps working either way.
    }
};

/**
 * Removes every key of a storage area that starts with a prefix.
 *
 * @param kind - Which storage area.
 * @param prefix - Keys starting with this are removed.
 */
export const removeByPrefix = (kind: StorageKind, prefix: string): void => {
    // eslint-disable-next-line no-restricted-syntax -- Web Storage throws when blocked; nothing saved means nothing to clear
    try {
        const storage = area(kind);
        for (const key of Object.keys(storage)) if (key.startsWith(prefix)) storage.removeItem(key);
    } catch {
        // Blocked storage held nothing.
    }
};
