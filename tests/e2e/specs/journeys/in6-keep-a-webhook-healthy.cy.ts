// requires-module: account, cart, orders, products, webhooks
/**
 * @module
 * IN6 · Keep a webhook healthy from the UI, as the manager. A subscription is refused for an unsafe
 * address, then made; its secret is shown once, rotated, and the old one removed, with the last
 * one refused. It is switched off, found by the list filter, and stays silent through an order;
 * switched back on, it gets a delivery row. The admin sees it too, and the manager deletes it.
 *
 * Run as the manager on purpose: webhooks are not an admin-only corner. The subscription's URL is
 * `https://127.0.0.1:1/…`: it passes the SSRF guard (which exempts the demo receiver's host) and
 * nothing listens there, so no delivery ever succeeds and none is needed to.
 */
import {
    deliveriesOf,
    placeOrderAsCustomer,
    seededSubscription,
    setEnabledInTheForm
} from '../../../support/e2e/integrator';
import { eventually } from '../../../support/e2e/steps';

/** The subscription's address, unique per run. */
const ENDPOINT = `https://127.0.0.1:1/in6-${String(Date.now())}`;

/** What the SSRF guard's refusal says, as the form shows it. */
const REFUSED_ADDRESS = 'cannot be a webhook target';

/**
 * Fills the create form's address and picks the one event, then submits.
 *
 * @param address - the URL to type
 */
const submitTheCreateForm = (address: string): void => {
    cy.get('[data-test=webhook-url] input').clear();
    cy.get('[data-test=webhook-url] input').type(address);
    cy.get('form').submit();
};

/**
 * Opens a one-time secret's reveal and reads it, then dismisses it.
 *
 * @returns a chain yielding the secret that was shown
 */
const readAndDismissTheSecret = (): Cypress.Chainable<string> =>
    cy
        .get('[data-test=secret-reveal-value]')
        .invoke('text')
        .then((text) => text.trim())
        .then((secret) => {
            expect(secret, 'a signing secret').to.match(/^whsec_/);
            cy.get('[data-test=secret-reveal-confirm-saved] input').click();
            cy.get('[data-test=secret-reveal-continue]').click();
            return cy.wrap(secret, { log: false });
        });

describe('IN6 · Keep a webhook healthy from the UI', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refuses an unsafe address, rotates and removes secrets, and stays silent while off', () => {
        cy.step('the manager is refused a plain-http address, and a private one');
        cy.loginAs('manager');
        cy.visit('/en/webhooks/subscriptions/create');
        cy.pickOption('[data-test=webhook-event-types]', 'order.created');
        cy.get('body').type('{esc}');
        submitTheCreateForm('http://example.com/in6');
        cy.get('[data-test=webhook-url]').should('contain.text', 'must use https');
        submitTheCreateForm('https://10.0.0.1/in6');
        cy.get('#webhook-create-page').should('contain.text', REFUSED_ADDRESS);
        cy.get('[data-test=secret-reveal]').should('not.exist');

        cy.step('a safe address is accepted, and its secret is shown once');
        submitTheCreateForm(ENDPOINT);
        readAndDismissTheSecret().then((first) => {
            cy.get('#webhook-target').should('exist');
            cy.get('[data-test=webhook-secret-row]').should('have.length', 1);
            cy.get('body').should('not.contain.text', first);

            cy.step('rotating shows a second secret once, and the ring then holds two');
            cy.get('[data-test=webhook-rotate-secret]').click();
            readAndDismissTheSecret().then((second) => {
                expect(second, 'a different secret').to.not.equal(first);
                cy.get('[data-test=webhook-secret-row]').should('have.length', 2);
                cy.get('body').should('not.contain.text', second);
            });

            cy.step('removing the old one leaves one, and the last cannot be removed');
            cy.get('[data-test=webhook-secret-remove]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=webhook-secret-row]').should('have.length', 1);
            cy.get('[data-test=webhook-secret-remove]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=webhook-target-remove-secret-error]').should(
                'contain.text',
                'at least one active secret'
            );
            cy.get('[data-test=webhook-secret-row]').should('have.length', 1);
        });

        cy.step('the admin sees the manager’s subscription');
        cy.apiAs<{ items: { id: string; url: string }[] }>(
            'admin',
            'GET',
            '/webhooks/subscriptions'
        ).then((page) => {
            const mine = page?.items.find((subscription) => subscription.url === ENDPOINT);
            if (!mine) throw new Error('IN6: the admin cannot see the manager’s subscription');

            cy.step('the manager switches it off, and the list filter finds it under Disabled');
            setEnabledInTheForm(mine.id, ENDPOINT, false);
            cy.visit('/en/webhooks/subscriptions');
            cy.pickOption('[data-test=filter-enabled]', 'Disabled');
            cy.contains('[data-test=list-row]', ENDPOINT).should('exist');
            cy.pickOption('[data-test=filter-enabled]', 'Enabled');
            cy.contains('[data-test=list-row]', ENDPOINT).should('not.exist');

            cy.step(
                'an order is placed while it is off: the shop’s own receiver hears, this one not'
            );
            seededSubscription().then((seeded) => {
                deliveriesOf(seeded.id).then((before) => {
                    placeOrderAsCustomer();
                    eventually(
                        () => deliveriesOf(seeded.id),
                        (rows) => rows.length > before.length
                    );
                    deliveriesOf(mine.id).should('have.length', 0);
                });
            });

            cy.step('switched back on, the next order gets a delivery row, filtered in the log');
            setEnabledInTheForm(mine.id, ENDPOINT, true);
            placeOrderAsCustomer();
            eventually(
                () => deliveriesOf(mine.id),
                (rows) => rows.length === 1
            );
            cy.visit('/en/webhooks/deliveries');
            cy.pickOption('[data-test=webhook-delivery-filter-subscription]', ENDPOINT);
            cy.get('[data-test=webhook-delivery-row]').should('have.length', 1);
            cy.get('[data-test=webhook-delivery-event]').should('have.text', 'order.created');
            cy.pickOption('[data-test=webhook-delivery-filter-status]', 'Succeeded');
            cy.get('[data-test=webhook-delivery-row]').should('not.exist');

            cy.step('the manager deletes it from its own page');
            cy.visit(`/en/webhooks/subscriptions/${mine.id}`);
            cy.get('[data-test=webhook-delete]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.url().should('match', /\/webhooks\/subscriptions$/);
            cy.contains('[data-test=list-row]', ENDPOINT).should('not.exist');
        });
    });
});
