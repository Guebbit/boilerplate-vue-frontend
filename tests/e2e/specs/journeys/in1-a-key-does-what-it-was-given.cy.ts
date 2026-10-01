// requires-module: api-keys, webhooks
/**
 * @module
 * IN1 · A key can do exactly what it was given. The admin mints a read-only key in the form, with
 * an expiry; the secret is shown once and never again. The integrator's script reads with it, is
 * refused a write, and is refused everything once the admin revokes it.
 *
 * The key holds `webhooks.any.read`: a read a guest cannot make, so "it works" proves the key was
 * recognised, and the write is refused for want of `webhooks.any.create`, not for want of a login.
 * (`products.any.read` would prove nothing: a key's product reads are a guest's, since
 * `GET /products/:id` scopes by the session and a key has none.)
 */
import { requestAsGuest, requestWithKey } from '../../../support/e2e/harness';
import { datetimeLocalIn } from '../../../support/e2e/integrator';
import { eventually } from '../../../support/e2e/steps';

/** The one read the key is given. */
const GIVEN = 'webhooks.any.read';

/** One day, in milliseconds: how long the key lives. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** A name for the key, unique enough that two runs on one backend never read each other's row. */
const KEY_NAME = `in1-reader-${String(Date.now())}`;

/** A subscription body the key is not allowed to create. */
const A_WRITE = { url: 'https://127.0.0.1:1/in1', eventTypes: ['order.created'] };

describe('IN1 · A key can do exactly what it was given', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('reads what it was given, is refused the rest, and stops at revoke', () => {
        cy.step('the admin mints a read-only key that expires tomorrow');
        cy.loginAs('admin');
        cy.visit('/en/api-keys/create');
        cy.get('[data-test=api-key-name] input').type(KEY_NAME);
        cy.get('[data-test=api-key-permissions] input').type(`${GIVEN}{enter}`);
        cy.get('[data-test=api-key-expires-at] input').type(datetimeLocalIn(DAY_MS));
        cy.get('form').submit();

        cy.step('the secret is shown once');
        cy.get('[data-test=secret-reveal-value]')
            .invoke('text')
            .then((text) => text.trim())
            .then((secret) => {
                expect(secret, 'a secret key').to.match(/^sk_/);
                cy.get('[data-test=secret-reveal-confirm-saved] input').click();
                cy.get('[data-test=secret-reveal-continue]').click();
                cy.url().should('include', '/api-keys').and('not.include', '/create');
                cy.get('#api-keys-list-page').should('exist');
                cy.contains('[data-test=list-row]', KEY_NAME).should('exist');
                cy.get('body').should('not.contain.text', secret);
                cy.reload();
                cy.contains('[data-test=list-row]', KEY_NAME).within(() => {
                    cy.get('[data-test=api-key-status]').should(
                        'have.attr',
                        'data-status',
                        'active'
                    );
                    cy.get('[data-test=api-key-last-used]').should('have.attr', 'data-used', 'no');
                });
                cy.get('body').should('not.contain.text', secret);

                cy.step('the script reads with it, and a guest cannot');
                requestAsGuest('GET', '/webhooks/subscriptions').should('equal', 401);
                requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                    .its('status')
                    .should('equal', 200);

                cy.step('the same key is refused a write it was not given');
                requestWithKey(secret, 'POST', '/webhooks/subscriptions', A_WRITE)
                    .its('status')
                    .should('equal', 403);

                cy.step('the list now says the key was used');
                eventually(
                    () =>
                        cy.apiAs<{ items: { name: string; lastUsedAt?: string }[] }>(
                            'admin',
                            'GET',
                            '/api-keys'
                        ),
                    (page) =>
                        page?.items.find((key) => key.name === KEY_NAME)?.lastUsedAt !== undefined
                );
                cy.visit('/en/api-keys');
                cy.contains('[data-test=list-row]', KEY_NAME).within(() => {
                    cy.get('[data-test=api-key-last-used]').should('have.attr', 'data-used', 'yes');
                });

                cy.step('the admin revokes it, and the key authenticates nothing');
                cy.contains('[data-test=list-row]', KEY_NAME).within(() => {
                    cy.get('[data-test=row-revoke]').click();
                });
                cy.get('[data-test=app-dialog-confirm]').click();
                cy.contains('[data-test=list-row]', KEY_NAME).within(() => {
                    cy.get('[data-test=api-key-status]').should(
                        'have.attr',
                        'data-status',
                        'revoked'
                    );
                    cy.get('[data-test=row-revoke]').should('be.disabled');
                });
                requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                    .its('status')
                    .should('equal', 401);
            });
    });
});
