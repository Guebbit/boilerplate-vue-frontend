/**
 * @module
 * Conditional writes, client side: remember the `ETag` a GET, a PATCH or an action answered with, and send it
 * back as `If-Match` on the next PUT/PATCH of the same resource. The server refuses with 412
 * when someone else changed the record in between; a form turns that into "reload".
 * A DELETE carries none: staff delete on purpose, and the server would still check one if sent
 * (RFC 9110 §13.1.1).
 *
 * Wired onto the shared axios instance by `index.ts`, so every edit form gets it without knowing.
 * A leaf of the http tier: it imports `url.ts` and nothing of this app.
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { toPathname } from './url.ts';

/**
 * The tag last seen per resource, keyed by the resource's own path (`/products/abc`). Module state,
 * not a Pinia store: it is transport bookkeeping no view renders, and it must survive a route change.
 */
const tags = new Map<string, string>();

/**
 * Methods whose answer carries the row's tag. A PUT answers none (RFC 9110 §9.3.4), so the tag
 * held for it is dropped and the next conditional write re-reads first.
 */
const TAGGING_METHODS = new Set(['get', 'patch']);

/**
 * Methods that take an `If-Match`. DELETE is left out on purpose: it is optional in RFC 9110 and a
 * delete from our screens is never refused for a stale version.
 */
const CONDITIONAL_METHODS = new Set(['put', 'patch']);

/**
 * The tag currently held for a resource, or `undefined` when it was never read through here.
 *
 * @param url - The resource's path, e.g. `/products/abc`.
 */
export const knownEtag = (url: string): string | undefined => tags.get(toPathname(url));

/**
 * Forgets the tag held for one resource, so the next write of it goes out unconditionally.
 * For a write that deliberately carries no fence (a bulk import warns instead).
 *
 * @param url - The resource's path, e.g. `/locales/es/apps/demo-fe/entries`.
 */
export const forgetEtag = (url: string): void => {
    tags.delete(toPathname(url));
};

/**
 * Forgets every held tag — for a sign-out, where the next person must not inherit the last one's
 * versions, and for specs.
 */
export const clearEtags = (): void => {
    tags.clear();
};

/**
 * Request interceptor: attaches `If-Match` to a PUT/PATCH of a resource whose tag is known.
 * A caller that set its own `If-Match` keeps it; a resource never read here goes out
 * unconditionally, which is the API's own default.
 *
 * @param config - Outgoing request config.
 * @returns The same config, with `If-Match` set when it applies.
 */
export const onEtagRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const method = config.method?.toLowerCase() ?? 'get';
    if (!CONDITIONAL_METHODS.has(method) || config.headers.has('If-Match')) return config;

    const tag = tags.get(toPathname(config.url));
    if (tag) config.headers.set('If-Match', tag);
    return config;
};

/**
 * Whether `path` is the resource `key` or something under it (`/orders/1/cancel` is under `/orders/1`).
 */
const isUnder = (path: string, key: string): boolean => path === key || path.startsWith(`${key}/`);

/**
 * Response interceptor: keeps the tag a resource answers with, and drops tags an answer without one
 * has just made stale.
 *
 * A successful write under a held path changes the row, so every tag held under that path goes —
 * the next edit then goes out unconditionally rather than with a tag that is certain to be refused.
 * One exception: a POST answer that carries an `ETag` and a `Content-Location` naming a record we
 * hold (cancel, override-status, activate) hands over that record's NEW tag, and it is kept.
 * The contract says so itself (`x-versioned` posts), and RFC 9110 §8.7 trusts a `Content-Location`
 * for another URL when both share an owner, which ours do.
 *
 * @param response - A successful response.
 * @returns The same response, untouched: this observes, it never unwraps.
 */
export const onEtagResponse = (response: AxiosResponse): AxiosResponse => {
    const method = response.config.method?.toLowerCase() ?? 'get';
    const key = toPathname(response.config.url);
    const tag: unknown = response.headers.etag;
    const location: unknown = response.headers['content-location'];

    // Read before the drop below: "held" means held when the action was sent.
    const named =
        method === 'post' && typeof location === 'string' && location
            ? toPathname(location)
            : undefined;
    const heldNamed = named !== undefined && tags.has(named) ? named : undefined;

    if (method !== 'get') for (const held of tags.keys()) if (isUnder(key, held)) tags.delete(held);

    if (typeof tag !== 'string' || !tag) return response;
    if (TAGGING_METHODS.has(method)) tags.set(key, tag);
    else if (heldNamed) tags.set(heldNamed, tag);
    return response;
};
