/**
 * One authenticated admin API call, made from Node.
 *
 * Registered as the `adminApi` task in `cypress.config.ts` and used by `fixtures.ts` to provision
 * the subjects a visibility spec needs. It runs OUTSIDE the browser for the reason the
 * `createSession` task beside it does: a plain fetch carries no browser cookie jar, so the page's
 * own refresh cookie — and with it which session counts as "current" — is left untouched.
 *
 * The token is fetched per call rather than cached. `cy.resetState()` drops and reseeds the
 * database between tests, which invalidates whatever was issued before it; against an in-memory
 * backend the extra round-trip is a few milliseconds, and a stale-token retry path would cost
 * more to keep honest than it saves.
 */

export interface AdminApiRequest {
    apiUrl: string;
    path: string;
    method: string;
    email: string;
    password: string;
    body?: Record<string, unknown>;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

/** The envelope both paired backends answer with; `data` is the payload the caller wants. */
const unwrap = <T>(response: Response, context: string): Promise<T> =>
    response.json().then((payload: { success?: boolean; data?: T; message?: string }) => {
        if (!response.ok)
            throw new Error(
                `adminApi: ${context} answered ${String(response.status)} — ${payload.message ?? 'no message'}`
            );
        return payload.data as T;
    });

const login = (apiUrl: string, email: string, password: string): Promise<string> =>
    fetch(`${apiUrl}/account/login`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ email, password })
    })
        .then((response) => unwrap<{ token: string }>(response, 'POST /account/login'))
        .then(({ token }) => token);

export const adminApi = <T>({
    apiUrl,
    path,
    method,
    email,
    password,
    body
}: AdminApiRequest): Promise<T | null> =>
    login(apiUrl, email, password)
        .then((token) =>
            fetch(`${apiUrl}${path}`, {
                method,
                headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
                body: body === undefined ? undefined : JSON.stringify(body)
            })
        )
        // A task must resolve to something serialisable, and `undefined` makes Cypress fail the
        // command — so a body-less answer (DELETE) becomes null rather than nothing.
        .then((response) => unwrap<T>(response, `${method} ${path}`))
        .then((data) => data ?? null);
