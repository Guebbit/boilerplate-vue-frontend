// requires-module: account, cart, orders, products, webhooks
/**
 * @module
 * IN3 · An order fires a webhook, and it arrives signed. A customer buys something through the
 * storefront; the shop's receiver is told, in a payload that names the order, signed so that the
 * subscription's secret verifies it. The admin rotates that secret and the next delivery verifies
 * under both the old and the new; after the old one is removed, only the new.
 *
 * Two profiles, one story. Live, the broker delivers at once to a real `webhook-tester`, and the
 * journey only reads it. Demo has no broker: the delivery row waits as `pending` and the admin's
 * Replay is what sends it, to a listener Cypress hosts. A replay signs with the ring as it stands
 * NOW, which is also what makes the rotation steps cheap: no second order is needed.
 *
 * The receiver is the backend's own seeded subscription: an ordinary `https://` one, whose fixed
 * demo secret is the first the signature is checked under.
 */
import { DEMO_WEBHOOK_SECRET } from '../../../../scripts/e2e/webhook-demo-secret';
import { forgetWebhooks, webhooksReceived } from '../../../support/e2e/harness';
import {
    deliveriesOf,
    eventOf,
    expectVerifiesUnder,
    latestOf,
    newDelivery,
    seededSubscription
} from '../../../support/e2e/integrator';
import { addToCartFromStorefront, eventually, idFromLocation } from '../../../support/e2e/steps';

/** The row whose Replay button names `deliveryId`, in the delivery log. */
const rowOf = (deliveryId: string): Cypress.Chainable<JQuery> =>
    cy
        .get(`[data-test=webhook-delivery-replay][aria-label*="${deliveryId}"]`)
        .closest('[data-test=webhook-delivery-row]');

describe('IN3 · An order fires a webhook, and it arrives signed', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('delivers the order to the receiver, signed, and keeps verifying through a rotation', () => {
        seededSubscription().then((subscription) => {
            forgetWebhooks();
            deliveriesOf(subscription.id).then((before) => {
                const known = before.map((row) => row.id);

                cy.step('a customer buys something');
                cy.loginAs('user');
                addToCartFromStorefront('product.rich');
                cy.goToCart();
                cy.checkoutWith('pickup');
                cy.get('#order-target').should('exist');

                idFromLocation().then((orderId) => {
                    cy.step('the admin finds an order.created row in the delivery log');
                    newDelivery(subscription.id, known).then((delivery) => {
                        expect(delivery.eventType).to.equal('order.created');
                        cy.switchUser('admin');
                        cy.visit(`/en/webhooks/deliveries?subscriptionId=${subscription.id}`);
                        rowOf(delivery.id).within(() => {
                            cy.get('[data-test=webhook-delivery-event]').should(
                                'have.text',
                                'order.created'
                            );
                        });

                        cy.env(['liveProfile']).then(({ liveProfile }) => {
                            if (liveProfile === true) {
                                cy.step('live: the broker delivers it, so the row settles');
                                eventually(
                                    () => deliveriesOf(subscription.id),
                                    (rows) =>
                                        rows.find((row) => row.id === delivery.id)?.status ===
                                        'succeeded'
                                );
                                return;
                            }
                            cy.step('demo: nothing sends it until the admin replays it');
                            rowOf(delivery.id).within(() => {
                                cy.get('[data-test=webhook-delivery-status]').should(
                                    'have.attr',
                                    'data-status',
                                    'pending'
                                );
                            });
                            cy.intercept('POST', '**/webhooks/deliveries/*/replay').as('replay');
                            cy.get(
                                `[data-test=webhook-delivery-replay][aria-label*="${delivery.id}"]`
                            ).click();
                            cy.wait('@replay').its('response.statusCode').should('equal', 200);
                            rowOf(delivery.id).within(() => {
                                cy.get('[data-test=webhook-delivery-status]').should(
                                    'have.attr',
                                    'data-status',
                                    'succeeded'
                                );
                            });
                        });

                        cy.step('the receiver has the order, and the signature verifies');
                        /** What the receiver captured about THIS order — a live tester keeps older sessions' too. */
                        const aboutThisOrder = () =>
                            webhooksReceived(subscription.url).then((received) =>
                                received.filter((request) => eventOf(request).orderId === orderId)
                            );
                        eventually(aboutThisOrder, (received) => received.length > 0).then(
                            (received) => {
                                expect(received, 'one delivery of the order').to.have.length(1);
                                expect(eventOf(received[0]).type).to.equal('order.created');
                                expect(received[0].headers['webhook-id']).to.equal(
                                    delivery.eventId
                                );
                                expectVerifiesUnder(received[0], [
                                    { secret: DEMO_WEBHOOK_SECRET, verifies: true }
                                ]);
                            }
                        );

                        cy.step('a rotation signs with both secrets while it overlaps');
                        cy.apiAs<{ newSecret: string }>(
                            'admin',
                            'POST',
                            `/webhooks/subscriptions/${subscription.id}/rotate-secret`
                        ).then((rotated) => {
                            const newSecret = rotated?.newSecret ?? '';
                            expect(newSecret, 'the new secret, shown once').to.match(/^whsec_/);
                            cy.apiAs('admin', 'POST', `/webhooks/deliveries/${delivery.id}/replay`);
                            eventually(aboutThisOrder, (received) => received.length >= 2).then(
                                (received) => {
                                    expectVerifiesUnder(latestOf(received), [
                                        { secret: DEMO_WEBHOOK_SECRET, verifies: true },
                                        { secret: newSecret, verifies: true }
                                    ]);
                                }
                            );

                            cy.step('with the old one removed, only the new one verifies');
                            cy.apiAs(
                                'admin',
                                'DELETE',
                                `/webhooks/subscriptions/${subscription.id}/secrets/${subscription.secretIds[0]}`
                            );
                            cy.apiAs('admin', 'POST', `/webhooks/deliveries/${delivery.id}/replay`);
                            eventually(aboutThisOrder, (received) => received.length >= 3).then(
                                (received) => {
                                    expectVerifiesUnder(latestOf(received), [
                                        { secret: DEMO_WEBHOOK_SECRET, verifies: false },
                                        { secret: newSecret, verifies: true }
                                    ]);
                                }
                            );
                        });
                    });
                });
            });
        });
    });
});
