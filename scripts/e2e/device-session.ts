/**
 * A second device, made server-side: a login that keeps its own refresh cookie and access token.
 *
 * A plain Node `fetch` has no cookie jar, so the page's own session is left exactly as the spec
 * found it — and the cookie this file keeps is what makes the device real: a refresh needs it, and
 * a logout-everywhere or a password reset is proved by that refresh failing afterwards.
 *
 * Stateless on purpose. The spec holds the {@link Device} and hands it back with every call, so
 * two devices in one test are two plain values and nothing lives in the Cypress node process.
 *
 * Pure of Cypress, and outside `tests/support/e2e/`, so the unit suite can pin it without a
 * browser. The `cy.task` wiring is in `cypress.config.ts`.
 */

/** What a device holds: where it talks to, its bearer token, and its refresh cookie. */
export interface Device {
    /** The API base URL, no trailing slash. */
    apiUrl: string;
    /** The access token, sent as `Authorization: Bearer`. */
    token: string;
    /** The refresh cookie as a `Cookie` header value, `jwt=<token>`. */
    cookie: string;
}

/** What one call from a device answers: the status, the JSON body if any, and the device as it now is. */
export interface DeviceResponse {
    /** The HTTP status. A non-2xx is data here, not a throw — a spec asserts on a refused refresh. */
    status: number;
    /** The parsed JSON body, or `null` when there was none. */
    body: unknown;
    /** The device after the call: the access token and cookie the answer rotated, else unchanged. */
    device: Device;
}

/** What {@link deviceLogin} takes. */
export interface DeviceCredentials {
    apiUrl: string;
    email: string;
    password: string;
}

/** What {@link deviceRequest} takes. */
export interface DeviceRequest {
    device: Device;
    /** The path after the API base URL, leading slash included. */
    path: string;
    method: string;
    /** A JSON body, for the verbs that carry one. */
    body?: Record<string, unknown>;
}

/** The refresh cookie's name — the backend's `REFRESH_COOKIE`. */
const REFRESH_COOKIE = 'jwt';

/** The JSON request header both paired backends expect on a body. */
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * The refresh cookie a response set, as a `Cookie` header value.
 *
 * `null` when the response did not set one, or set it empty — which is how a logout clears it.
 *
 * @param headers - the response's headers
 * @returns `jwt=<value>`, or `null`
 */
export const refreshCookieFrom = (headers: Headers): string | null => {
    const prefix = `${REFRESH_COOKIE}=`;
    // `getSetCookie()` returns each Set-Cookie header on its own; `get('set-cookie')` would fold them into one string.
    const set = headers.getSetCookie().find((line) => line.startsWith(prefix));
    const value = set?.slice(prefix.length).split(';')[0] ?? '';
    return value === '' ? null : `${prefix}${value}`;
};

/**
 * The access token in a login or refresh answer, `undefined` when there is none.
 *
 * @param body - the parsed JSON envelope
 */
const tokenIn = (body: unknown): string | undefined => {
    const data = (body as { data?: { token?: unknown } } | null)?.data;
    return typeof data?.token === 'string' ? data.token : undefined;
};

/**
 * Parse a body as JSON; `null` when it is empty or not JSON (a proxy's HTML error page).
 *
 * @param text - the raw body
 */
const parseJson = (text: string): unknown => {
    if (text === '') return null;
    // JSON.parse throws synchronously and has no non-throwing form.
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
};

/**
 * Read a response body as JSON, `null` when there is none.
 *
 * @param response - the response to read
 */
const jsonOf = (response: Response): Promise<unknown> => response.text().then(parseJson);

/**
 * Sign in as a new device.
 *
 * @param credentials - the API and the account
 * @returns the device, with the access token and refresh cookie the login issued
 * @throws {Error} when the login is refused, or issues no token (a two-factor account answers a challenge instead)
 */
export const deviceLogin = ({ apiUrl, email, password }: DeviceCredentials): Promise<Device> =>
    fetch(`${apiUrl}/account/login`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ email, password })
    }).then((response) =>
        jsonOf(response).then((body) => {
            const token = tokenIn(body);
            const cookie = refreshCookieFrom(response.headers);
            if (!response.ok || token === undefined || cookie === null)
                throw new Error(
                    `deviceLogin: ${email} got ${String(response.status)} and ${token === undefined ? 'no token' : 'no refresh cookie'}`
                );
            return { apiUrl, token, cookie };
        })
    );

/**
 * What a device becomes after one answer: a fresh access token and cookie when it carried them.
 *
 * @param device - the device before
 * @param response - the answer
 * @param body - the answer's parsed body
 */
const afterAnswer = (device: Device, response: Response, body: unknown): Device => ({
    ...device,
    token: response.ok ? (tokenIn(body) ?? device.token) : device.token,
    cookie: refreshCookieFrom(response.headers) ?? device.cookie
});

/**
 * Ask for a new access token with the device's refresh cookie — `GET /account/refresh`.
 *
 * A refused refresh (401) is returned, not thrown: "device 2's refresh is 401" is what a journey
 * asserts after a reset or a logout-everywhere.
 *
 * @param device - the device to refresh
 */
export const deviceRefresh = (device: Device): Promise<DeviceResponse> =>
    fetch(`${device.apiUrl}/account/refresh`, { headers: { Cookie: device.cookie } }).then(
        (response) =>
            jsonOf(response).then((body) => ({
                status: response.status,
                body,
                device: afterAnswer(device, response, body)
            }))
    );

/**
 * One authenticated call from the device, with its bearer token.
 *
 * The refresh cookie travels too, so a route that reads "which session is current" sees this
 * device's own. A non-2xx is returned, not thrown.
 *
 * @param request - the device and the call
 */
export const deviceRequest = ({
    device,
    path,
    method,
    body
}: DeviceRequest): Promise<DeviceResponse> =>
    fetch(`${device.apiUrl}${path}`, {
        method,
        headers: {
            ...JSON_HEADERS,
            Authorization: `Bearer ${device.token}`,
            Cookie: device.cookie
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    }).then((response) =>
        jsonOf(response).then((answer) => ({
            status: response.status,
            body: answer,
            // A request never rotates the access token, but a logout clears the cookie — keep the
            // old one so the spec can still show that the refresh with it is now refused.
            device
        }))
    );
