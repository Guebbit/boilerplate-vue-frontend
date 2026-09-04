/**
 * @module
 * Response interceptor for the step-up flow: a `REAUTH_REQUIRED` 401 is parked, answered by one
 * `ReauthDialog.vue` prompt (single-flight, like `refresh.ts`'s own refresh call), and the parked
 * request is replayed once a fresh session exists. Delegates every OTHER 401 to
 * `onResponseRejectWithRefresh` unchanged — this file only ever intercepts the one error code.
 *
 * Ordering matters: a `REAUTH_REQUIRED` 401 is still a 401, and `onResponseRejectWithRefresh`
 * would happily "fix" it by refreshing — the refresh cookie IS valid, so the refresh succeeds,
 * the request replays, and answers `REAUTH_REQUIRED` again with nothing left to do about it. This
 * interceptor has to see the error CODE before that branch ever runs.
 */

import { instance } from './client.ts';
import { onResponseReject } from './interceptors.ts';
import { onResponseRejectWithRefresh } from './refresh.ts';
import { useReauthPromptStore } from './reauth-prompt.ts';
import { singleFlight } from './single-flight.ts';
import type { AxiosError } from 'axios';
import type { AxiosRequestConfigWithRetry, AxiosResponseErrorBody } from './types.ts';
import type { ResponseReject } from '@/types';

/**
 * Opens (or joins) the step-up prompt, single-flight (see `single-flight.ts`) — one dialog, N
 * parked requests, never N dialogs.
 *
 * @returns A promise resolving once a fresh session exists, rejected if the visitor closes the
 *  prompt without one.
 */
const requestFreshSession = singleFlight((): Promise<void> =>
    useReauthPromptStore().requestStepUp()
);

/**
 * Reads the error CODE off a rejection body without trusting the type past the wire: an axios
 * error's `data` is asserted by its generic parameter, not verified, so an empty `errors` array
 * (legal at the type level, since `ResponseReject.errors` carries no length guarantee) must not
 * throw here.
 *
 * @param data - `error.response?.data`, still unknown at this boundary.
 * @returns The first structured error's `code`, or `undefined` when the shape does not match.
 */
const firstErrorCode = (data: unknown): string | undefined => {
    if (typeof data !== 'object' || data === null) return undefined;
    const items = (data as { errors?: unknown }).errors;
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const [item] = items as unknown[];
    if (typeof item !== 'object' || item === null) return undefined;
    const { code } = item as { code?: unknown };
    return typeof code === 'string' ? code : undefined;
};

/**
 * Response error interceptor for the step-up flow.
 *
 * @param error - Axios error that triggered the interceptor.
 * @returns The replayed request's response once a fresh session exists; the normal
 *  refresh-and-retry outcome for every other 401; the normalized rejection when the visitor
 *  closes the prompt without re-proving their password.
 */
export const onResponseRejectWithStepUp = (
    error: AxiosError<ResponseReject, AxiosResponseErrorBody>
) => {
    const originalRequest = error.config as AxiosRequestConfigWithRetry | undefined;
    const code = firstErrorCode(error.response?.data);

    if (
        error.response?.status === 401 &&
        code === 'REAUTH_REQUIRED' &&
        !originalRequest?._dontRetry &&
        originalRequest
    )
        return requestFreshSession()
            .then(() =>
                instance.request({
                    ...originalRequest,
                    _dontRetry: true
                } as AxiosRequestConfigWithRetry)
            )
            .catch(() => onResponseReject(error));

    return onResponseRejectWithRefresh(error);
};
