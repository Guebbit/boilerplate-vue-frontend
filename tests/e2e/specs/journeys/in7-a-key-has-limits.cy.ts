// requires-module: account, api-keys, webhooks
/**
 * @module
 * IN7 · A key has limits. The admin cannot hand a key a permission the admin does not hold; a key
 * minted with one write can make that write and nothing else, not even read it back. A key never
 * reaches the routes that belong to a person's session, and once its expiry passes it stops.
 *
 * The expiry steps move the demo backend's clock (`cy.travel`), so they run on demo only; live, the
 * story ends at the session-only routes. The chip that says "Expired" reads the BROWSER's clock,
 * which `cy.travel` does not move, so the page is reloaded under `cy.clock`.
 */
import { requestWithKey } from '../../../support/e2e/harness';
import { datetimeLocalIn } from '../../../support/e2e/integrator';

/** One hour, in milliseconds: how long the key lives, and how far past it the clock jumps twice over. */
const HOUR_MS = 60 * 60 * 1000;

/** A permission the admin does not hold: a platform key, which no shop role carries. */
const NOT_THE_ADMINS = 'platform.observability.any.read';

/** The one write the key is given. */
const GIVEN = 'webhooks.any.create';

/** A name for the key, unique enough that two runs on one backend never read each other's row. */
const KEY_NAME = `in7-writer-${String(Date.now())}`;

/** The address the key subscribes: the one host the SSRF guard lets a private address through. */
const SUBSCRIBED = `https://127.0.0.1:1/in7-${String(Date.now())}`;

describe('IN7 · A key has limits', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('is refused a permission its minter lacks, writes only what it was given, and expires', () => {
        cy.step('the admin tries to mint a key with a permission the admin does not hold');
        cy.loginAs('admin');
        cy.visit('/en/api-keys/create');
        cy.get('[data-test=api-key-name] input').type(KEY_NAME);
        cy.get('[data-test=api-key-permissions] input').type(`${NOT_THE_ADMINS}{enter}`);
        cy.get('form').submit();
        cy.get('[data-test=api-key-permissions]').should('contain.text', NOT_THE_ADMINS);
        cy.get('[data-test=secret-reveal]').should('not.exist');

        cy.step('a key with one write and an hour to live is minted');
        cy.reload();
        cy.get('[data-test=api-key-name] input').type(KEY_NAME);
        cy.get('[data-test=api-key-permissions] input').type(`${GIVEN}{enter}`);
        cy.get('[data-test=api-key-expires-at] input').type(datetimeLocalIn(HOUR_MS));
        cy.get('form').submit();
        cy.get('[data-test=secret-reveal-value]')
            .invoke('text')
            .then((text) => text.trim())
            .then((secret) => {
                cy.get('[data-test=secret-reveal-confirm-saved] input').click();
                cy.get('[data-test=secret-reveal-continue]').click();
                cy.get('#api-keys-list-page').should('exist');

                cy.step('it makes the write it was given');
                requestWithKey(secret, 'POST', '/webhooks/subscriptions', {
                    url: SUBSCRIBED,
                    eventTypes: ['order.created']
                })
                    .its('status')
                    .should('equal', 201);

                cy.step('it cannot read that write back, nor reach what belongs to a session');
                requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                    .its('status')
                    .should('equal', 403);
                requestWithKey(secret, 'GET', '/account').its('status').should('equal', 401);
                requestWithKey(secret, 'POST', '/api-keys', {
                    name: 'a key minted by a key',
                    permissions: [GIVEN]
                })
                    .its('status')
                    .should('equal', 401);

                cy.step('the admin sees what the key made');
                cy.visit('/en/webhooks/subscriptions');
                cy.contains('[data-test=list-row]', SUBSCRIBED).should('exist');

                cy.step('the key list says it was used, and is still active');
                cy.visit('/en/api-keys');
                cy.contains('[data-test=list-row]', KEY_NAME).within(() => {
                    cy.get('[data-test=api-key-last-used]').should('have.attr', 'data-used', 'yes');
                    cy.get('[data-test=api-key-status]').should(
                        'have.attr',
                        'data-status',
                        'active'
                    );
                });

                cy.env(['liveProfile']).then(({ liveProfile }) => {
                    if (liveProfile === true) return;

                    cy.step('two hours on, the backend refuses the key');
                    cy.travel(2 * HOUR_MS);
                    requestWithKey(secret, 'POST', '/webhooks/subscriptions', {
                        url: `${SUBSCRIBED}-late`,
                        eventTypes: ['order.created']
                    })
                        .its('status')
                        .should('equal', 401);

                    cy.step('and the list says Expired once the browser agrees');
                    cy.clock(Date.now() + 2 * HOUR_MS, ['Date']);
                    cy.visit('/en/api-keys');
                    cy.contains('[data-test=list-row]', KEY_NAME).within(() => {
                        cy.get('[data-test=api-key-status]').should(
                            'have.attr',
                            'data-status',
                            'expired'
                        );
                    });
                });
            });
    });
});
