/**
 * @module
 * Which guided tours this browser has already shown, persisted the way `theme-preference.ts`
 * persists the theme — a first-party cookie through `@guebbit/js-toolkit`'s `getCookie`/`setCookie`.
 * A remembered interface choice, so it needs no consent. One cookie holds a JSON list of
 * `account:tour:version` keys; a new account, tour or tour version is a new key, which is how a
 * changed tour is shown once more. Per browser: a new device sees the tour again. See
 * `docs/tools/tours.md`.
 */
import { getCookie, setCookie } from '@guebbit/js-toolkit';

/**
 * Name of the first-party cookie holding the list of seen keys.
 */
const COOKIE_NAME = 'toursSeen';

/**
 * How long a "seen" record survives — a year, same as the theme choice.
 */
const COOKIE_DAYS = 365;

/**
 * Most keys kept. The oldest fall off first, so the cookie stays far below the browser's 4 KB
 * limit however many accounts share the browser.
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
 * @returns The string kept in the cookie.
 */
export const tourSeenKey = (
    accountId: string | undefined,
    tourId: string,
    version: number
): string => `${accountId ?? GUEST}:${tourId}:${version}`;

/**
 * Reads the list a previous visit may have left.
 *
 * @returns The stored keys; empty for no cookie or anything that is not a list of strings.
 */
const readKeys = (): string[] => {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
        ? parsed.filter((key): key is string => typeof key === 'string')
        : [];
};

/**
 * Same as {@link readKeys} but a cookie that does not parse reads as empty — a tour showing again
 * is the whole cost of a damaged cookie.
 *
 * @returns The stored keys, never throws.
 */
const safeKeys = (): string[] => {
    // eslint-disable-next-line no-restricted-syntax -- JSON.parse of a cookie anyone can edit has no safe wrapper; the local answer is "nothing seen"
    try {
        return readKeys();
    } catch {
        return [];
    }
};

/**
 * Whether this browser already showed this account this version of this tour.
 *
 * @param key - A {@link tourSeenKey}.
 * @returns `true` once {@link markTourSeen} stored the key.
 */
export const hasSeenTour = (key: string): boolean => safeKeys().includes(key);

/**
 * Records that the tour was shown (finished or skipped — both count).
 *
 * @param key - A {@link tourSeenKey}.
 */
export const markTourSeen = (key: string): void => {
    const keys = [...safeKeys().filter((existing) => existing !== key), key].slice(-MAX_KEYS);
    // js-toolkit `setCookie(name, value, options)`: `days` = lifetime, `path: '/'` = site-wide,
    // `sameSite: 'Lax'` = sent on top-level navigations only. `secure` follows the page's protocol.
    setCookie(COOKIE_NAME, JSON.stringify(keys), {
        days: COOKIE_DAYS,
        path: '/',
        secure: location.protocol === 'https:',
        sameSite: 'Lax'
    });
};
