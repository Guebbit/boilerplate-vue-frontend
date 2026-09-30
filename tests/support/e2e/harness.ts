/// <reference types="cypress" />

/**
 * The typed doors onto the harness's Node-side tasks: a second device, a payment-provider
 * webhook, and the webhook sink the demo profile hosts.
 *
 * Plain functions over `cy.task`, not commands: each one names what it returns, so a spec reads
 * `loginDevice('user').then((device) => …)` and the compiler knows `device`. The logic is in
 * `scripts/e2e/` (device-session, payment-webhook, webhook-sink); the tasks are registered in
 * `cypress.config.ts`.
 */
import type { Device, DeviceResponse } from '../../../scripts/e2e/device-session';
import type { PaymentWebhookEvent } from '../../../scripts/e2e/payment-webhook';
import type { SinkRequest } from '../../../scripts/e2e/webhook-sink';
import { seedAccount, type E2ERole } from './scenario';

export type { Device, DeviceResponse } from '../../../scripts/e2e/device-session';
export type { PaymentWebhookEvent } from '../../../scripts/e2e/payment-webhook';
export type { SinkRequest } from '../../../scripts/e2e/webhook-sink';

/**
 * Sign in as a second device — a real login, made server-side, so the page's own session and
 * refresh cookie are untouched. Keep the device and pass it to {@link refreshDevice} and
 * {@link requestAsDevice}.
 *
 * @param role - which seeded account; `user` by default
 */
export const loginDevice = (role: E2ERole = 'user'): Cypress.Chainable<Device> =>
    cy.env(['apiUrl']).then(({ apiUrl }) =>
        cy.task<Device>('deviceLogin', {
            apiUrl: String(apiUrl),
            email: seedAccount(role).email,
            password: seedAccount(role).password
        })
    );

/**
 * `GET /account/refresh` with the device's own refresh cookie. A refused refresh (401) is an
 * answer, not a failure: it is what a journey asserts after a logout-everywhere or a reset.
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
