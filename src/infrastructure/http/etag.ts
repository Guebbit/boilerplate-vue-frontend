/**
 * @module
 * Conditional writes, client side: remember the `ETag` a read or a write answered with, and send it
 * back as `If-Match` on the next PUT/PATCH/DELETE of the same resource. The server refuses with 412
 * when someone else changed the record in between; a form turns that into "reload".
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
 * Paths that are another VIEW of the same resource share its tag: the editor's read
 * (`/products/{id}/admin`) and the hard-delete spelling (`/users/{id}/hard`) validate the same row.
 */
const VIEW_SUFFIX = /\/(?:admin|hard)$/;

/**
 * Methods that answer with the row's new state and its new tag.
 */
const TAGGING_METHODS = new Set(['get', 'put', 'patch']);

/**
 * Methods that take an `If-Match`.
 */
const CONDITIONAL_METHODS = new Set(['put', 'patch', 'delete']);

/**
 * The resource a request is about.
 *
 * @param url - Request URL, absolute or relative.
 * @returns Its pathname without a view suffix.
 */
const resourceKey = (url: string | undefined): string => toPathname(url).replace(VIEW_SUFFIX, '');

/**
 * The tag currently held for a resource, or `undefined` when it was never read through here.
 *
 * @param url - The resource's path, e.g. `/products/abc`.
 */
export const knownEtag = (url: string): string | undefined => tags.get(resourceKey(url));

/**
 * Forgets every held tag — for a sign-out, where the next person must not inherit the last one's
 * versions, and for specs.
 */
export const clearEtags = (): void => {
    tags.clear();
};

/**
 * Request interceptor: attaches `If-Match` to a PUT/PATCH/DELETE of a resource whose tag is known.
 * A caller that set its own `If-Match` keeps it; a resource never read here goes out
 * unconditionally, which is the API's own default.
 *
 * @param config - Outgoing request config.
 * @returns The same config, with `If-Match` set when it applies.
 */
export const onEtagRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const method = config.method?.toLowerCase() ?? 'get';
    if (!CONDITIONAL_METHODS.has(method) || config.headers.has('If-Match')) return config;

    const tag = tags.get(resourceKey(config.url));
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
 * A successful action on a resource (`POST /orders/1/cancel`, a restore) changes the row but says
 * nothing about its new version, so every tag held under that path goes — the next edit then goes
 * out unconditionally rather than with a tag that is certain to be refused.
 *
 * @param response - A successful response.
 * @returns The same response, untouched: this observes, it never unwraps.
 */
export const onEtagResponse = (response: AxiosResponse): AxiosResponse => {
    const method = response.config.method?.toLowerCase() ?? 'get';
    const key = resourceKey(response.config.url);
    const tag: unknown = response.headers.etag;

    if (method !== 'get')
        for (const held of tags.keys())
            if (isUnder(toPathname(response.config.url), held)) tags.delete(held);

    if (TAGGING_METHODS.has(method) && typeof tag === 'string' && tag) tags.set(key, tag);
    return response;
};
