/**
 * One authenticated admin API call, made from Node.
 *
 * Registered as the `adminApi` task in `cypress.config.ts` and used by `fixtures.ts` to provision
 * the subjects a visibility spec needs. It runs OUTSIDE the browser for the reason the
 * `deviceLogin` task beside it does: a plain fetch carries no browser cookie jar, so the page's
 * own refresh cookie — and with it which session counts as "current" — is left untouched.
 *
 * The token is fetched per call rather than cached. `cy.restore()` drops and reseeds the
 * database between tests, which invalidates whatever was issued before it; against an in-memory
 * backend the extra round-trip is a few milliseconds, and a stale-token retry path would cost
 * more to keep honest than it saves.
 */

import { loginTotpCodeFor } from '../../../scripts/e2e/totp';

export interface AdminApiRequest {
    apiUrl: string;
    path: string;
    method: string;
    email: string;
    password: string;
    /** The account's authenticator secret: a staff login answers a challenge it has to meet. */
    totpSecret?: string;
    body?: Record<string, unknown>;
}

/** Headers every JSON request here sends. */
const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * The envelope both paired backends answer with; `data` is the payload the caller wants.
 *
 * A refusal's `errors` ride along in the thrown message: a bare "Unprocessable Entity" does not say
 * whether a URL, a cap or a field was refused, and a run that fails once cannot be asked again.
 */
const unwrap = <T>(response: Response, context: string): Promise<T> =>
    response
        .json()
        .then((payload: { success?: boolean; data?: T; message?: string; errors?: unknown }) => {
            if (!response.ok)
                throw new Error(
                    `adminApi: ${context} answered ${String(response.status)} — ${payload.message ?? 'no message'}` +
                        (payload.errors === undefined ? '' : ` ${JSON.stringify(payload.errors)}`)
                );
            return payload.data as T;
        });

/**
 * Logs in as the given account and resolves its bearer credential. Asks for `transport: bearer`
 * so cookie mode answers with a `sessionToken` instead of a cookie nobody here can hold.
 */
const login = (
    apiUrl: string,
    email: string,
    password: string,
    totpSecret?: string
): Promise<string> =>
    fetch(`${apiUrl}/account/login`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ email, password, transport: 'bearer' })
    })
        .then((response) =>
            unwrap<{
                token?: string;
                sessionToken?: string;
                mfaRequired?: boolean;
                challenge?: string;
            }>(response, 'POST /account/login')
        )
        .then((data) =>
            data.mfaRequired === true && totpSecret
                ? loginTotpCodeFor(totpSecret, apiUrl).then((code) =>
                      fetch(`${apiUrl}/account/login/2fa`, {
                          method: 'POST',
                          headers: jsonHeaders,
                          body: JSON.stringify({
                              challenge: data.challenge,
                              code,
                              transport: 'bearer'
                          })
                      }).then((response) =>
                          unwrap<{ token?: string; sessionToken?: string }>(
                              response,
                              'POST /account/login/2fa'
                          )
                      )
                  )
                : data
        )
        .then(({ token, sessionToken }) => token ?? sessionToken ?? '');

/**
 * The bearer of each staff account already signed in, by API and address.
 *
 * A staff login asks a code, and the backend accepts a code once per 30-second step, so signing in
 * on every call would make a spec of a dozen calls wait minutes for the clock. Kept per account
 * until the data is restored (`forgetAdminTokens`) or the backend refuses it with a 401, when the
 * call signs in again and retries once. A shopper's login has no such cost and stays per call.
 */
const staffTokens = new Map<string, string>();

/**
 * Forgets the staff bearers. Called when the backend's data is restored: the restore ends every
 * session, so a kept bearer would only be refused.
 */
export const forgetAdminTokens = (): null => {
    staffTokens.clear();
    return null;
};

/**
 * One authenticated fetch, as the backend answered it.
 *
 * @param request - the call
 * @param token - the bearer to send
 */
const sendWith = (
    { apiUrl, path, method, body }: AdminApiRequest,
    token: string
): Promise<Response> =>
    fetch(`${apiUrl}${path}`, {
        method,
        headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

/**
 * Cypress task: one authenticated call to the backend API as the given account, resolving the
 * unwrapped `data` payload. Logs in first (a staff account once, see {@link staffTokens}), so no
 * session is shared with the spec's browser.
 */
export const adminApi = <T>(request: AdminApiRequest): Promise<T | null> => {
    const { apiUrl, path, method, email, password, totpSecret } = request;
    const key = `${apiUrl}|${email}`;
    // A task must resolve to something serialisable, and `undefined` makes Cypress fail the
    // command — so a body-less answer (DELETE) becomes null rather than nothing.
    const read = (response: Response): Promise<T | null> =>
        unwrap<T>(response, `${method} ${path}`).then((data) => data ?? null);
    const signedInCall = (): Promise<T | null> =>
        login(apiUrl, email, password, totpSecret)
            .then((token) => {
                if (totpSecret) staffTokens.set(key, token);
                return sendWith(request, token);
            })
            .then(read);
    const kept = totpSecret ? staffTokens.get(key) : undefined;

    if (kept === undefined) return signedInCall();

    // A kept bearer the backend no longer knows (the clock moved, a session ended): sign in again.
    return sendWith(request, kept).then((response) =>
        response.status === 401 ? signedInCall() : read(response)
    );
};

/**
 * Cypress task: one call with no credential, made from Node. `cy.request` would carry the
 * browser's session cookie in cookie mode, so a "guest" check through it is not a guest.
 * Resolves the status and the parsed body (`null` when the answer is not JSON).
 */
export const guestApi = ({
    apiUrl,
    path,
    method = 'GET'
}: {
    apiUrl: string;
    path: string;
    method?: string;
}): Promise<{ status: number; body: unknown }> =>
    fetch(`${apiUrl}${path}`, { method }).then((response) =>
        response
            .json()
            .catch(() => null)
            .then((body: unknown) => ({ status: response.status, body }))
    );
