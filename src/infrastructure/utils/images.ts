/**
 * @module
 * Three URL-shaping leaves that answer one question from different angles: given a record's
 * `imageUrl`, what does `<img src>` get? Resolve to absolute, ask for a thumbnail variant, or
 * fall back to a bundled placeholder.
 */

import { instance } from '@/infrastructure/http/client.ts';

/**
 * Turning what the API stores into something a browser can actually fetch — and standing in for
 * what it does not store yet.
 *
 * Three separate jobs, kept in one leaf because they are the same decision seen from three sides:
 * given a record's `imageUrl`, what does `<img src>` get?
 *
 *   1. {@link resolveImageUrl} — the path the API returns is relative TO THE API, not to us.
 *   2. {@link thumbnailImageUrl} — the small variant, which nothing serves yet.
 *   3. {@link placeholderImageUrl} — what to show when the answer to 1 is "nothing".
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
 * Name of the query parameter the API takes to resize an image, e.g. `w` for `?w=64`.
 *
 * Empty — the default, and the state of the world today — means the backend serves ONE size per
 * upload and there is no thumbnail to ask for. See {@link thumbnailImageUrl}.
 */
const THUMBNAIL_WIDTH_PARAMETER =
    (import.meta.env.VITE_IMAGE_THUMBNAIL_PARAM as string | undefined)?.trim() ?? '';

/**
 * The small, cheap variant of an image, for the tier that loads first.
 *
 * **The backend does not serve one yet.** It stores exactly the bytes that were uploaded, at one
 * size, so asking for a thumbnail today has no answer and this returns `undefined` — which
 * {@link LazyImage} reads as "there is no first tier, load the full image lazily and be done".
 *
 * When the backend grows sized variants, this becomes a one-line `.env` change rather than a code
 * change: set `VITE_IMAGE_THUMBNAIL_PARAM` to whatever it names the width parameter and every call
 * site starts requesting thumbnails. The query-string shape is the one nearly every image pipeline
 * offers (imgproxy, thumbor, a sharp middleware); a backend that instead serves variants at
 * distinct PATHS would need this function rewritten, and that is the intended place to do it.
 *
 * @param source - The record's `imageUrl`.
 * @param width - Intended display width in CSS pixels.
 * @returns The thumbnail URL, or `undefined` when the API serves no variants.
 */
export const thumbnailImageUrl = (source?: string | null, width = 64): string | undefined => {
    if (!THUMBNAIL_WIDTH_PARAMETER) return undefined;

    const resolved = resolveImageUrl(source);
    if (!resolved) return undefined;

    const separator = resolved.includes('?') ? '&' : '?';
    return `${resolved}${separator}${THUMBNAIL_WIDTH_PARAMETER}=${Math.round(width)}`;
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
