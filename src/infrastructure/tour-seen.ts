/**
 * @module
 * Which guided tours this browser has already shown, kept in `localStorage` as one JSON record,
 * `{ savedAt, keys }`. A remembered interface choice, so it needs no consent. `keys` is a list of
 * `account:tour:version` strings; a new account, tour or tour version is a new key, which is how a
 * changed tour is shown once more. The record is dropped six months after its last change, so a
 * browser asks again rather than remembering forever. Per browser: a new device sees the tour
 * again. See `docs/tools/tours.md`.
 */
import { BROWSER_STORAGE_NAME, SIX_MONTHS_DAYS } from '@/infrastructure/browser-storage.ts';

/**
 * Name of the `localStorage` key holding the record.
 */
const STORAGE_KEY = BROWSER_STORAGE_NAME.toursSeen;

/**
 * How long a record survives after its last change, in milliseconds.
 */
const MAX_AGE_MS = SIX_MONTHS_DAYS * 24 * 60 * 60 * 1000;

/**
 * Most keys kept. The oldest fall off first, so the record stays small however many accounts
 * share the browser.
 */
const MAX_KEYS = 40;

/**
 * Account id used for a visitor who is not signed in.
 */
const GUEST = 'guest';

/**
 * The key one account's view of one tour version is stored under.
 *
 * @param accountId - The signed-in account's id, or `undefined` for a guest.
 * @param tourId - The tour's catalogue id.
 * @param version - The tour's version; bumping it makes the tour new again.
 * @returns The string kept in the record.
 */
export const tourSeenKey = (
    accountId: string | undefined,
    tourId: string,
    version: number
): string => `${accountId ?? GUEST}:${tourId}:${version}`;

/**
 * Reads the keys a previous visit may have left.
 *
 * @param now - The current time, epoch milliseconds.
 * @returns The stored keys; empty for no record, an expired one, a damaged one or one that is not
 *  `{ savedAt, keys }` — a tour showing again is the whole cost of any of those.
 */
const readKeys = (now: number): string[] => {
    // eslint-disable-next-line no-restricted-syntax -- `localStorage` throws when blocked and JSON.parse when the text is damaged; either means "nothing seen", never a failure
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        // `JSON.parse` returns `any`; the record is narrowed field by field below.
        const { savedAt, keys } = JSON.parse(raw) as { savedAt?: unknown; keys?: unknown };
        if (typeof savedAt !== 'number' || now - savedAt > MAX_AGE_MS || !Array.isArray(keys))
            return [];
        return (keys as unknown[]).filter((key): key is string => typeof key === 'string');
    } catch {
        return [];
    }
};

/**
 * Whether this browser already showed this account this version of this tour.
 *
 * @param key - A {@link tourSeenKey}.
 * @param now - The current time, epoch milliseconds.
 * @returns `true` once {@link markTourSeen} stored the key.
 */
export const hasSeenTour = (key: string, now: number = Date.now()): boolean =>
    readKeys(now).includes(key);

/**
 * Records that the tour was shown (finished or skipped — both count), and restarts the record's
 * six months.
 *
 * @param key - A {@link tourSeenKey}.
 * @param now - The current time, epoch milliseconds.
 */
export const markTourSeen = (key: string, now: number = Date.now()): void => {
    const keys = [...readKeys(now).filter((existing) => existing !== key), key].slice(-MAX_KEYS);
    // eslint-disable-next-line no-restricted-syntax -- `localStorage` throws when blocked or full; losing the record costs one more showing of a tour
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: now, keys }));
    } catch {
        // Nothing to report to: the tour was shown either way.
    }
};
