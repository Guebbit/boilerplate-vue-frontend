/**
 * @module
 * Which error-page messages are safe to show as themselves rather than folded into one generic
 * key. A router error's message can be free-form text — a stale chunk's URL, a caught
 * `Error.message` — and showing that verbatim leaks an implementation detail into the page, the
 * URL and Umami's pageview. `Error.vue` and `router/index.ts`'s `onError` both check this
 * through the one predicate, so the two places never disagree about what counts as "known".
 */

/**
 * Dictionary namespaces an error message is allowed to name directly — every other string
 * collapses to {@link GENERIC_ERROR_KEY}.
 */
const KNOWN_ERROR_MESSAGE_PREFIXES = ['error-page.', 'navigation.'];

/**
 * The key shown for anything not recognised by {@link isKnownErrorMessage} — a thrown message, a
 * fetch failure's text, a stale chunk's URL, or nothing at all.
 */
export const GENERIC_ERROR_KEY = 'error-page.unexpected';

/**
 * Whether `message` is a dictionary key the Error page may translate and show directly.
 *
 * @param message - a route's `:message` param, or a caught error's own `.message`.
 * @returns `true` only for a key under one of {@link KNOWN_ERROR_MESSAGE_PREFIXES}.
 */
export const isKnownErrorMessage = (message: string): boolean =>
    KNOWN_ERROR_MESSAGE_PREFIXES.some((prefix) => message.startsWith(prefix));
