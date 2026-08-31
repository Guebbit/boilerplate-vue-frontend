/**
 * @module
 * Two URL-shaping leaves that answer one question from different angles: given a record's
 * `imageUrl` (or `thumbnailUrl`), what does `<img src>` get? Resolve to absolute, or fall back to
 * a bundled placeholder.
 */

import { instance } from '@/infrastructure/http/client.ts';

/**
 * Turning what the API stores into something a browser can actually fetch — and standing in for
 * what it does not store at all.
 *
 * Two separate jobs, kept in one leaf because they are the same decision seen from two sides:
 * given a record's `imageUrl` (or `thumbnailUrl` — both are server-relative paths, `resolveImageUrl`
 * does not care which field they came from), what does `<img src>` get?
 *
 *   1. {@link resolveImageUrl} — the path the API returns is relative TO THE API, not to us.
 *   2. {@link placeholderImageUrl} — what to show when the answer to 1 is "nothing".
 */

/**
 * Whether a source is already fetchable as written: an absolute URL (`https:`), a scheme-relative
 * one (`//cdn…`), or one of the in-memory schemes an upload preview mints (`blob:`, `data:`).
 *
 * Anything else is a path on the API host, and is the only case {@link resolveImageUrl} rewrites.
 */
const isSelfContained = (source: string) => /^(?:[a-z][\d+.a-z-]*:|\/\/)/i.test(source);

/**
 * The absolute URL for an image the API returned.
 *
 * `openapi.yaml`'s `ImageUrl` is an `uri-reference`, and an uploaded file comes back as a path
 * relative to the API host — `/images/<hash>.png`. Handed to `<img src>` unchanged, the browser
 * resolves it against the page's own origin, which is the FRONTEND: with `VITE_API_URL` pointing
 * at another host (the default: :8080 here, :3000 there) and no dev proxy, every stored image is a
 * 404 that shows as a broken icon and nothing else. The e2e suite could not see it either, because
 * asserting on the `src` attribute asserts the string, never that a byte arrived.
 *
 * The prefix is read off the axios instance rather than from `import.meta.env`, so it follows the
 * client — including the e2e shard runner's `__E2E_API_URL` override, which is a runtime value no
 * build-time env read can see.
 *
 * @param source - The record's `imageUrl`, or an object URL, or nothing.
 * @returns An absolute (or same-origin) URL for `<img src>`; `undefined` when there is no image,
 *  which is what tells a caller to show {@link placeholderImageUrl} instead.
 */
export const resolveImageUrl = (source?: string | null): string | undefined => {
    if (!source) return undefined;
    if (isSelfContained(source)) return source;

    const apiOrigin = instance.defaults.baseURL ?? '';
    // Deployed behind one origin, the API path already IS the URL — and joining it onto an empty
    // prefix would produce a leading `//`, which the browser reads as a scheme-relative host.
    if (!apiOrigin) return source.startsWith('/') ? source : `/${source}`;

    return `${apiOrigin.replace(/\/+$/, '')}/${source.replace(/^\/+/, '')}`;
};

/**
 * A stand-in picture for a record that has none.
 *
 * A bundled asset (`public/images/no-image-placeholder.svg`) rather than a third-party fetch: no
 * network dependency, nothing to intercept in tests, nothing to point at another company's
 * infrastructure for every visitor without a picture. It is a vector, so it scales cleanly to
 * whatever box `LazyImage` reserves without a width/height of its own to pass along.
 *
 * One function rather than a path written into six templates, so a catalogue that later wants a
 * different stand-in changes it here once.
 *
 * @returns The placeholder's URL, same-origin, for `<img src>`.
 */
export const placeholderImageUrl = (): string => '/images/no-image-placeholder.svg';
