/// <reference types="cypress" />

/**
 * The typed doors onto the harness's Node-side tasks: a second device, a call made with an API
 * key or no credential at all, a payment-provider webhook, and the webhook receiver — the sink
 * the demo profile hosts, or the `webhook-tester` the live one runs.
 *
 * Plain functions over `cy.task`, not commands: each one names what it returns, so a spec reads
 * `loginDevice('user').then((device) => …)` and the compiler knows `device`. The logic is in
 * `scripts/e2e/` (device-session, payment-webhook, webhook-sink, webhook-tester); the tasks are registered in
 * `cypress.config.ts`.
 */
import type { Device, DeviceResponse, SessionMode } from '../../../scripts/e2e/device-session';
import type { PaymentWebhookEvent } from '../../../scripts/e2e/payment-webhook';
import type { SinkRequest } from '../../../scripts/e2e/webhook-sink';
import type { ReceivedWebhook } from '../../../scripts/e2e/webhook-tester';
import type { E2ERole } from '../scenario-description';

export type { Device, DeviceResponse, SessionMode } from '../../../scripts/e2e/device-session';
export type { PaymentWebhookEvent } from '../../../scripts/e2e/payment-webhook';
export type { SinkRequest } from '../../../scripts/e2e/webhook-sink';
export type { ReceivedWebhook } from '../../../scripts/e2e/webhook-tester';

/**
 * Skips the running test unless the backend keeps people signed in the given way
 * (`E2E_SESSION_MODE`, which the demo shards pass on as the backend's `NODE_SESSION_MODE`).
 * For the few journeys about one mode's own machinery: refresh-token rotation, an origin check.
 *
 * @param context - Mocha's test context, so the spec must be a regular `function`
 * @param mode - the only mode the test applies to
 */
export const skipUnlessSessionMode = (context: Mocha.Context, mode: SessionMode) =>
    cy.env(['sessionMode']).then(({ sessionMode }) => {
        if (sessionMode !== mode) context.skip();
    });

/**
 * Sign in as a second device with credentials the seed does not know — an account a journey made
 * itself. {@link loginDevice} covers the seeded ones.
 *
 * @param email - the account's address
 * @param password - its password
 */
export const loginDeviceWith = (email: string, password: string): Cypress.Chainable<Device> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.task<Device>('deviceLogin', { apiUrl: String(apiUrl), email, password })
        );

/**
 * Sign in as a second device — a real login, made server-side, so the page's own session and
 * refresh cookie are untouched. Keep the device and pass it to {@link refreshDevice} and
 * {@link requestAsDevice}.
 *
 * @param role - which seeded account; `user` by default
 */
export const loginDevice = (role: E2ERole = 'user'): Cypress.Chainable<Device> =>
    cy.accountOf(role).then(({ email, password }) => loginDeviceWith(email, password));

/**
 * Renews the device's own session: `POST /account/refresh` in `jwt` mode, and in `cookie` mode
 * (no refresh endpoint) `GET /account`, which says the same thing — alive (200) or revoked (401).
 * A refused answer is an answer, not a failure: it is what a journey asserts after a
 * logout-everywhere or a reset.
 *
 * @param device - the device to refresh
 */
export const refreshDevice = (device: Device): Cypress.Chainable<DeviceResponse> =>
    cy.task<DeviceResponse>('deviceRefresh', device);

/**
 * One call from the device, with its bearer token. A non-2xx is an answer, not a failure.
 *
 * @param device - the device making the call
 * @param method - the HTTP verb
 * @param path - the path after the API base, leading slash included
 * @param body - a JSON body, for the verbs that carry one
 */
export const requestAsDevice = (
    device: Device,
    method: string,
    path: string,
    body?: Record<string, unknown>
): Cypress.Chainable<DeviceResponse> =>
    cy.task<DeviceResponse>('deviceRequest', { device, method, path, body });

/**
 * Sign a payment-provider event and post it to `/payments/webhook`, as the provider would.
 *
 * @param event - the normalised event; `id` is deduplicated by the backend
 * @param timestamp - unix seconds for the signature; an old one proves a stale delivery is refused
 * @returns the HTTP status the backend answered
 */
export const postPaymentWebhook = (
    event: PaymentWebhookEvent,
    timestamp?: number
): Cypress.Chainable<number> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.task<number>('postPaymentWebhook', { apiUrl: String(apiUrl), event, timestamp })
        );

/** The webhook sink the demo profile hosts. Demo only — open the test with `cy.skipUnlessDemo()`. */
export const webhookSink = {
    /**
     * Forget what has arrived, and make sure the sink is listening. Call it before triggering the
     * delivery, so the first request has somewhere to land.
     */
    clear: (): Cypress.Chainable<null> => cy.task<null>('webhookSinkClear'),

    /**
     * Every request received since the last clear, oldest first, each with `signatureValid`
     * against the seeded subscription's known secret.
     */
    requests: (): Cypress.Chainable<SinkRequest[]> => cy.task<SinkRequest[]>('webhookSinkRequests')
};

/**
 * The code an authenticator app shows for a TOTP secret — read the secret off the enrolment screen,
 * then type this. The backend accepts a step only once, so the code that confirms an enrolment is
 * step 0 and every later one must be a step further on.
 *
 * @param secret - the base32 secret the enrolment dialog displays
 * @param stepsFromNow - how many 30-second steps ahead of now; 0 by default
 */
export const totpCodeFor = (secret: string, stepsFromNow = 0): Cypress.Chainable<string> =>
    cy.task<string>('totpCode', { secret, stepsFromNow });

/**
 * One call with a bearer credential that is not a session — an `sk_…` API key, as the integrator's
 * script would send it. A non-2xx is an answer, not a failure. Made from Node, so no browser
 * cookie rides along.
 *
 * @param credential - the bearer value
 * @param method - the HTTP verb
 * @param path - the path after the API base, leading slash included
 * @param body - a JSON body, for the verbs that carry one
 */
export const requestWithKey = (
    credential: string,
    method: string,
    path: string,
    body?: Record<string, unknown>
): Cypress.Chainable<DeviceResponse> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            requestAsDevice(
                { apiUrl: String(apiUrl), mode: 'jwt', token: credential, cookie: '' },
                method,
                path,
                body
            )
        );

/**
 * One call with no credential at all — what a guest's script gets. A non-2xx is an answer.
 *
 * @param method - the HTTP verb
 * @param path - the path after the API base, leading slash included
 */
export const requestAsGuest = (method: string, path: string): Cypress.Chainable<number> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.task<{ status: number }>('guestApi', { apiUrl: String(apiUrl), path, method })
        )
        .its('status');

/**
 * Forget what the receiver has captured so far, so a journey reads only what its own trigger
 * causes. The demo sink is cleared (and started, if nothing has asked for it yet); the live
 * `webhook-tester` is left alone — it keeps a session's history, so a journey picks its own deliveries out by
 * the order they name.
 */
export const forgetWebhooks = (): Cypress.Chainable<null> =>
    cy
        .env(['liveProfile'])
        .then(({ liveProfile }) =>
            liveProfile === true ? cy.wrap(null, { log: false }) : webhookSink.clear()
        );

/**
 * Every webhook the shop's receiver has captured for one subscription URL, oldest first, on
 * whichever profile is running: the Cypress-hosted sink on demo, the real `webhook-tester` on live.
 *
 * @param subscriptionUrl - the seeded subscription's URL, which names the tester's session on live
 *  and the request path on demo
 */
export const webhooksReceived = (subscriptionUrl: string): Cypress.Chainable<ReceivedWebhook[]> =>
    cy.env(['liveProfile']).then(({ liveProfile }): Cypress.Chainable<ReceivedWebhook[]> => {
        if (liveProfile === true)
            return cy.task<ReceivedWebhook[]>('webhookTesterRequests', subscriptionUrl);
        const { pathname } = new URL(subscriptionUrl);
        return webhookSink
            .requests()
            .then((requests): ReceivedWebhook[] =>
                requests.filter((request) => request.path === pathname)
            );
    });

/**
 * Whether a received webhook verifies under `secret` — any one of the `v1,` entries in its
 * signature header matching is enough, as a rotation signs with every secret on the ring.
 *
 * @param received - one captured request
 * @param secret - the `whsec_…` signing secret
 */
export const signatureVerifies = (
    received: ReceivedWebhook,
    secret: string
): Cypress.Chainable<boolean> =>
    cy.task<boolean>('webhookSignatureValid', {
        headers: received.headers,
        body: received.body,
        secret
    });

/**
 * Another browser tab of the same person, played from the page under test.
 *
 * A `BroadcastChannel` never hears its own posts and the app's instance is module-private, so
 * the second tab is a second channel object on the same name in the same page. The `session`
 * channel carries `login`, `logout` and `activity` (`src/infrastructure/session.ts`).
 */
export const otherTab = {
    /**
     * Sends one message on the `session` channel, as another tab would.
     *
     * @param message - the payload; `type` names it
     */
    post: (
        message: { type: string } & Record<string, unknown>
    ): Cypress.Chainable<Cypress.AUTWindow> =>
        cy.window({ log: false }).then((win) => {
            const channel = new win.BroadcastChannel('session');
            channel.postMessage(message);
            channel.close();
            return win;
        }),

    /**
     * Signs in as `role` the way a second tab would — a login whose cookies land in the browser's
     * own jar, which this page shares — then announces it with a `login` message.
     *
     * The app answers a `login` message by re-reading the shared session, so the page changes
     * person without a reload.
     *
     * @param role - which seeded account
     */
    signIn: (role: E2ERole): Cypress.Chainable<Cypress.AUTWindow> =>
        cy.accountOf(role).then(({ email, password }) =>
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.request('POST', `${String(apiUrl)}/account/login`, { email, password });
                return otherTab.post({ type: 'login' });
            })
        )
};

/**
 * Makes every refund of an order's payment refuse with a provider reason, or lets them through
 * again — the demo backend's `POST /__test/payments/refund-failure`. Demo only.
 *
 * @param orderId - the order whose payment's refunds are steered
 * @param reason - a closed refund-failure code (`insufficient_funds`, `declined`, …), or `null`
 */
export const failRefundsOf = (orderId: string, reason: string | null): Cypress.Chainable<number> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.request({
                method: 'POST',
                url: `${String(apiUrl)}/__test/payments/refund-failure`,
                body: { orderId, reason }
            })
        )
        .its('status')
        .should('equal', 204);
