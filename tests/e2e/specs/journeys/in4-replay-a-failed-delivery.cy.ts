// requires-module: account, cart, orders, products, webhooks
/**
 * @module
 * IN4 · Replay a failed delivery. Two ways a delivery fails, and what the admin does about each
 * from the delivery log.
 *
 * An endpoint that is down: each Replay is one more attempt, counted and explained on the row.
 * An endpoint the shop switched off: the replay is refused on the row, and once it is switched
 * back on, the same Replay delivers it to the receiver. The receiver is the backend's seeded
 * `https://` subscription, so the switch is made in its own edit form.
 *
 * Replay is synchronous and re-sends against the subscription as it stands now, so it needs no
 * broker. The dead endpoint is `https://127.0.0.1:1`: the SSRF guard exempts the demo receiver's
 * host, so it can be subscribed to, and nothing listens on port 1.
 */
import { webhooksReceived } from '../../../support/e2e/harness';
import {
    deliveriesOf,
    deliveryNow,
    eventOf,
    newDelivery,
    placeOrderAsCustomer,
    seededSubscription,
    setEnabledInTheForm
} from '../../../support/e2e/integrator';
import { eventually } from '../../../support/e2e/steps';

/** An endpoint nothing listens on, at the one host the SSRF guard lets a private address through. */
const DEAD_ENDPOINT = 'https://127.0.0.1:1/in4-dead';

/** The row of one delivery in the log, found by the id its Replay button names. */
const replayButtonOf = (deliveryId: string): Cypress.Chainable<JQuery> =>
    cy.get(`[data-test=webhook-delivery-replay][aria-label*="${deliveryId}"]`);

/**
 * Presses Replay on one delivery and waits for the backend to have answered it.
 *
 * @param deliveryId - which row
 */
const replayInTheLog = (deliveryId: string): void => {
    cy.intercept('POST', '**/webhooks/deliveries/*/replay').as('replay');
    replayButtonOf(deliveryId).click();
    cy.wait('@replay').its('response.statusCode').should('equal', 200);
};

/**
 * Opens the delivery log narrowed to one subscription.
 *
 * @param subscriptionId - whose rows
 */
const openTheLogOf = (subscriptionId: string): void => {
    cy.visit(`/en/webhooks/deliveries?subscriptionId=${subscriptionId}`);
    cy.get('#webhook-deliveries-page').should('exist');
};

describe('IN4 · Replay a failed delivery', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('counts each retry against a dead endpoint, and delivers once a switched-off one is back on', () => {
        seededSubscription().then((seeded) => {
            cy.step('an endpoint that is down, and an order that announces itself to it');
            cy.apiAs<{ id: string }>('admin', 'POST', '/webhooks/subscriptions', {
                url: DEAD_ENDPOINT,
                eventTypes: ['order.created']
            }).then((dead) => {
                if (!dead) throw new Error('IN4: the dead subscription was not created');
                placeOrderAsCustomer();
                newDelivery(dead.id, []).then((delivery) => {
                    cy.loginAs('admin');
                    openTheLogOf(dead.id);

                    cy.env(['liveProfile']).then(({ liveProfile }) => {
                        if (liveProfile === true) {
                            cy.step('live: the broker has already tried it once, and failed');
                            eventually(
                                () => deliveryNow(dead.id, delivery.id),
                                (row) => row.error !== undefined
                            );
                            return;
                        }
                        cy.step('demo: nothing has tried it, so the first Replay is the first try');
                        replayInTheLog(delivery.id);
                    });

                    cy.step('the row says it failed, and why');
                    deliveryNow(dead.id, delivery.id).then((failed) => {
                        expect(failed.error, 'why it failed').to.contain('ECONNREFUSED');
                        expect(failed.status, 'still waiting for a retry').to.equal('pending');
                        cy.reload();
                        replayButtonOf(delivery.id)
                            .closest('[data-test=webhook-delivery-row]')
                            .within(() => {
                                cy.get('[data-test=webhook-delivery-status]').should(
                                    'have.attr',
                                    'data-status',
                                    'pending'
                                );
                                cy.contains('ECONNREFUSED').should('exist');
                            });

                        cy.step('another Replay is another attempt');
                        replayInTheLog(delivery.id);
                        deliveryNow(dead.id, delivery.id).then((again) => {
                            expect(again.attempt, 'one more attempt').to.equal(failed.attempt + 1);
                            expect(again.error).to.contain('ECONNREFUSED');
                        });
                    });
                });
            });

            cy.step('the shop switches its own endpoint off, and an order is placed');
            const known: string[] = [];
            deliveriesOf(seeded.id).then((rows) => {
                known.push(...rows.map((row) => row.id));
            });
            placeOrderAsCustomer().then((orderId) => {
                newDelivery(seeded.id, known).then((delivery) => {
                    cy.env(['liveProfile']).then(({ liveProfile }) => {
                        if (liveProfile !== true) return;
                        // Live, the broker is mid-delivery: a Replay now could meet its lease (409).
                        eventually(
                            () => deliveryNow(seeded.id, delivery.id),
                            (row) => row.status === 'succeeded'
                        );
                    });
                    setEnabledInTheForm(seeded.id, seeded.url, false);

                    cy.step('a Replay is refused on the row, while it is off');
                    openTheLogOf(seeded.id);
                    replayInTheLog(delivery.id);
                    replayButtonOf(delivery.id)
                        .closest('[data-test=webhook-delivery-row]')
                        .within(() => {
                            cy.get('[data-test=webhook-delivery-status]').should(
                                'have.attr',
                                'data-status',
                                'exhausted'
                            );
                            cy.contains('Subscription is disabled').should('exist');
                        });

                    cy.step('the log filters by status: exhausted shows it, succeeded does not');
                    cy.pickOption('[data-test=webhook-delivery-filter-status]', 'Exhausted');
                    replayButtonOf(delivery.id).should('exist');
                    cy.pickOption('[data-test=webhook-delivery-filter-status]', 'Succeeded');
                    replayButtonOf(delivery.id).should('not.exist');

                    cy.step('back on, the same Replay delivers it to the receiver');
                    setEnabledInTheForm(seeded.id, seeded.url, true);
                    openTheLogOf(seeded.id);
                    const arrivals = () =>
                        webhooksReceived(seeded.url).then((received) =>
                            received.filter((request) => eventOf(request).orderId === orderId)
                        );
                    arrivals().then((already) => {
                        replayInTheLog(delivery.id);
                        eventually(arrivals, (received) => received.length > already.length);
                    });
                    replayButtonOf(delivery.id)
                        .closest('[data-test=webhook-delivery-row]')
                        .within(() => {
                            cy.get('[data-test=webhook-delivery-status]').should(
                                'have.attr',
                                'data-status',
                                'succeeded'
                            );
                            cy.contains('Subscription is disabled').should('not.exist');
                        });
                });
            });
        });
    });
});
