/**
 * @module
 * One last write from a page that is going away. The generated client rides axios, whose XHR is
 * cancelled with the page; `fetch` with `keepalive` is the one browser door a request can leave
 * through after `pagehide` (`sendBeacon` only POSTs and cannot carry the bearer header).
 */
import { storeToRefs } from 'pinia';
import { getCurrentLocale } from '@/i18n';
import { useSessionStore } from '@/infrastructure/session.ts';
import { instance } from './client.ts';

/**
 * Sends a JSON write that outlives the page, fire and forget.
 *
 * Nobody is left to read the answer, so a failure is dropped on purpose: the next visit reads
 * the server's own state. Signed-out callers send nothing, since no bearer means a certain 401.
 *
 * @param method - the HTTP verb
 * @param path - the API path after the base, leading slash included
 * @param body - the JSON body
 */
export const sendKeepalive = (
    method: 'PUT' | 'PATCH' | 'POST',
    path: string,
    body: unknown
): void => {
    const { accessToken } = storeToRefs(useSessionStore());
    if (!accessToken.value) return;
    // https://developer.mozilla.org/docs/Web/API/Request/keepalive — `keepalive` lets the request
    // finish after the page is gone; the body is capped at 64 KiB, far above a quantity.
    fetch(`${instance.defaults.baseURL ?? ''}${path}`, {
        method,
        keepalive: true,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken.value}`,
            'Accept-Language': getCurrentLocale()
        },
        body: JSON.stringify(body)
    }).catch(() => undefined);
};
