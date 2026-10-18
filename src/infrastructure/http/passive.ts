/**
 * @module
 * The per-call axios config that marks a request as NOT the person acting.
 *
 * The server counts every other request as activity for the staff idle clock, so a read the app
 * makes on its own (a token refresh, an abilities re-read, the notifications sync) must carry the
 * header, or an unattended staff tab would never idle out.
 *
 * See: docs/theory/sessions.md
 */
import type { AxiosRequestConfig } from 'axios';

/** The header the paired backend's session guard reads (`kernel/middlewares/authorizations.ts`). */
export const SESSION_PASSIVE_HEADER = 'X-Session-Passive';

/**
 * Merges the passive marker into a per-call config.
 *
 * @param options - Per-call axios overrides to merge into.
 * @returns A shallow copy of `options` carrying the header next to whatever it already set.
 */
export const asPassive = (options?: AxiosRequestConfig): AxiosRequestConfig => ({
    ...options,
    // eslint-disable-next-line @typescript-eslint/no-misused-spread -- AxiosHeaders' own enumerable entries are exactly what an object spread copies; orvalMutator merges headers the same way
    headers: { ...options?.headers, [SESSION_PASSIVE_HEADER]: 'true' }
});
