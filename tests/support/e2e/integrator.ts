/// <reference types="cypress" />

import { eventually } from './steps';
import { signatureVerifies, webhooksReceived, type ReceivedWebhook } from './harness';

/**
 * Steps the integrator journeys (IN1–IN7) walk the same way: finding the shop's seeded webhook
 * receiver, placing an order behind the customer's back, and reading the delivery log and the
 * receiver back as data.
 *
 * Plain functions over `cy`, like `steps.ts`, and kept apart from it: these name the webhooks
 * module's own vocabulary. Imports `harness.ts` and `steps.ts` only — never `scenario.ts`, whose
 * second copy in a spec file goes stale (see `cy.accountOf`).
 */

/** The `WebhookSubscription` fields these journeys read. Structural: `contracts/` is not in this project. */
export interface SubscriptionRow {
    id: string;
    url: string;
    description?: string;
    enabled: boolean;
    eventTypes: string[];
    secretIds: string[];
}

/** The `WebhookDelivery` fields these journeys read. */
export interface DeliveryRow {
    id: string;
    /** The event's id, which the receiver sees as `webhook-id`. */
    eventId: string;
    subscriptionId: string;
    eventType: string;
    status: string;
    attempt: number;
    error?: string;
    responseCode?: number;
}

/** The description the backend's seed gives the receiver subscription (`scenarios/webhooks.ts`). */
const SEEDED_RECEIVER_DESCRIPTION = 'Demo sink (webhook-tester)';

/**
 * The shop's demo receiver (`webhook-tester` on live, the Cypress-hosted sink on demo), whose
 * signing secret the backend publishes as a fixed demo value. Found by the description the seed
 * gives it, because it is an ordinary `https://` subscription like any a journey makes. Refused if
 * there is not exactly one.
 *
 * @returns a chain yielding the subscription
 */
export const seededSubscription = (): Cypress.Chainable<SubscriptionRow> =>
    cy
        .apiAs<{ items: SubscriptionRow[] }>('admin', 'GET', '/webhooks/subscriptions')
        .then((page) => {
            const receivers = (page?.items ?? []).filter(
                (subscription) => subscription.description === SEEDED_RECEIVER_DESCRIPTION
            );
            expect(
                receivers,
                'one subscription described as the demo receiver (is NODE_WEBHOOK_DEMO_SINK_URL set on the backend?)'
            ).to.have.length(1);
            return receivers[0];
        });

/**
 * Switches a subscription on or off in its edit form, and waits for the saved notice.
 *
 * @param subscriptionId - which subscription
 * @param url - the address the form must show, so the right record is open
 * @param enabled - the state to leave it in
 */
export const setEnabledInTheForm = (
    subscriptionId: string,
    url: string,
    enabled: boolean
): void => {
    cy.visit(`/en/webhooks/subscriptions/${subscriptionId}/edit`);
    cy.get('[data-test=webhook-url] input').should('have.value', url);
    if (enabled) cy.get('[data-test=webhook-enabled] input').check({ force: true });
    else cy.get('[data-test=webhook-enabled] input').uncheck({ force: true });
    cy.get('form').submit();
    cy.contains('Subscription updated').should('exist');
};

/**
 * Puts one order in the shop as the customer, through the API: a pickup order paid by card, which
 * is placed (and so announced to webhooks) the moment the checkout answers. The UI checkout is
 * walked by the purchase journeys; here the order is only the trigger.
 *
 * Card, not bank transfer: the seed already holds an order awaiting a transfer, and a second one
 * trips the per-customer cap.
 *
 * @returns a chain yielding the new order's id
 */
export const placeOrderAsCustomer = (): Cypress.Chainable<string> =>
    cy.subjectId('product.inStock').then((productId) => {
        cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
        cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
        return cy.apiAs<{ id: string }>('user', 'POST', '/cart/checkout', {}).then((order) => {
            if (!order) throw new Error('placeOrderAsCustomer: the checkout answered no order');
            return order.id;
        });
    });

/**
 * One subscription's rows in the delivery log, newest first, as the admin API serves them.
 *
 * @param subscriptionId - whose rows
 * @returns a chain yielding every row, up to one page of the contract's largest size
 */
export const deliveriesOf = (subscriptionId: string): Cypress.Chainable<DeliveryRow[]> =>
    cy
        .apiAs<{ items: DeliveryRow[] }>(
            'admin',
            'GET',
            `/webhooks/deliveries?subscriptionId=${subscriptionId}&pageSize=100`
        )
        .then((page) => page?.items ?? []);

/**
 * Waits for a subscription to hold more delivery rows than it did, and yields the new one — the
 * order's `order.created`, which the backend writes through an event rather than inside the
 * checkout's own request.
 *
 * @param subscriptionId - whose rows
 * @param knownIds - the ids already there before the order
 * @returns a chain yielding the newest row that is not among `knownIds`
 */
export const newDelivery = (
    subscriptionId: string,
    knownIds: string[]
): Cypress.Chainable<DeliveryRow> =>
    eventually(
        () => deliveriesOf(subscriptionId),
        (rows) => rows.some((row) => !knownIds.includes(row.id))
    ).then((rows) => {
        const fresh = rows.find((row) => !knownIds.includes(row.id));
        if (!fresh) throw new Error('newDelivery: no delivery row for the new order');
        return fresh;
    });

/**
 * The delivery row's current state, re-read from the API.
 *
 * @param subscriptionId - whose log
 * @param deliveryId - which row
 * @returns a chain yielding the row
 */
export const deliveryNow = (
    subscriptionId: string,
    deliveryId: string
): Cypress.Chainable<DeliveryRow> =>
    deliveriesOf(subscriptionId).then((rows) => {
        const row = rows.find((candidate) => candidate.id === deliveryId);
        if (!row) throw new Error(`deliveryNow: delivery ${deliveryId} is not in the log`);
        return row;
    });

/**
 * Waits for the receiver to have captured at least `count` webhooks, and yields them all.
 *
 * @param receiverUrl - the subscription's URL, which names the receiver's session
 * @param count - how many must have arrived
 * @returns a chain yielding what arrived, oldest first
 */
export const receivedAtLeast = (
    receiverUrl: string,
    count: number
): Cypress.Chainable<ReceivedWebhook[]> =>
    eventually(
        () => webhooksReceived(receiverUrl),
        (received) => received.length >= count
    );

/**
 * What a captured webhook says it is about: the `type` and the order in `data`.
 *
 * @param received - one captured request
 */
export const eventOf = (received: ReceivedWebhook): { type: string; orderId: string } => {
    const body = JSON.parse(received.body) as { type: string; data: { orderId: string } };
    return { type: body.type, orderId: body.data.orderId };
};

/**
 * Asserts which of two secrets a captured webhook verifies under.
 *
 * @param received - one captured request
 * @param secrets - the old and the new `whsec_…` secret, and whether each should verify
 */
export const expectVerifiesUnder = (
    received: ReceivedWebhook,
    secrets: { secret: string; verifies: boolean }[]
): void => {
    for (const { secret, verifies } of secrets)
        signatureVerifies(received, secret).then((verified) => {
            expect(verified, `${received.headers['webhook-signature']} under ${secret}`).to.equal(
                verifies
            );
        });
};

/**
 * The newest of what a receiver captured.
 *
 * @param received - what arrived, oldest first
 * @throws {Error} when nothing arrived
 */
export const latestOf = (received: ReceivedWebhook[]): ReceivedWebhook => {
    const latest = received.at(-1);
    if (!latest) throw new Error('latestOf: the receiver captured nothing');
    return latest;
};

/**
 * A moment in the future, spelled the way a `datetime-local` input takes it: the browser's own
 * wall-clock digits, since the form reads them back as local time.
 *
 * @param fromNowMs - how far ahead, in milliseconds
 * @returns `YYYY-MM-DDTHH:mm`
 */
export const datetimeLocalIn = (fromNowMs: number): string => {
    const offsetMs = new Date().getTimezoneOffset() * 60_000;
    return new Date(Date.now() + fromNowMs - offsetMs).toISOString().slice(0, 16);
};
