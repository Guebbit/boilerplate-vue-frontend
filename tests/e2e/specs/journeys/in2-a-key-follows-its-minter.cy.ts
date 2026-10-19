// requires-module: account, api-keys, users, webhooks
/**
 * @module
 * IN2 · A key is only as good as its minter. An account promoted to administrator mints a read key
 * and a script uses it. A moderator is shown no ban control for that administrator and the server
 * refuses the ban; the root administrator bans it through the access dialog. While the minter is
 * banned the key reads nothing, lifting the ban brings it back, and a demoted minter's key floors
 * to the customer rules they hold now.
 *
 * The status a banned minter's key answers is asserted as "not a success" on purpose: it is a
 * guest-level refusal today and a 401 once a banned minter's key is refused like a revoked one.
 */
import { requestWithKey, loginDevice } from '../../../support/e2e/harness';
import { datetimeLocalIn } from '../../../support/e2e/integrator';
import { enrolAuthenticatorApp } from '../../../support/e2e/security-steps';
import { eventually, refusedWith } from '../../../support/e2e/steps';

/** The one read the key is given. */
const GIVEN = 'read:WebhookSubscription';

/** One day, in milliseconds: how long the key lives. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** One audit row, as far as this story reads it. */
interface AuditRowLike {
    action: string;
    actorRole: string;
}

describe('IN2 · A key follows its minter', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('is refused while the minter is banned or demoted, and works again when they are back', () => {
        cy.accountInRole('secondShopper').then(({ id: minterId }) => {
            cy.step('a shopper is promoted to administrator and mints a read key');
            cy.apiAs('admin', 'PATCH', `/users/${minterId}`, { role: 'admin' });
            cy.loginAs('secondShopper');
            // A staff role grants nothing until an authenticator app is armed, and a key lends only
            // what its minter holds.
            enrolAuthenticatorApp();
            cy.visit('/en/api-keys/create');
            cy.get('[data-test=api-key-name] input').type('in2-reader');
            cy.get('[data-test=api-key-permissions] input').type(`${GIVEN}{enter}`);
            cy.get('[data-test=api-key-expires-at] input').type(datetimeLocalIn(DAY_MS));
            cy.get('form').submit();
            cy.get('[data-test=secret-reveal-value]')
                .invoke('text')
                .then((text) => text.trim())
                .then((secret) => {
                    expect(secret, 'a secret key').to.match(/^sk_/);
                    cy.get('[data-test=secret-reveal-confirm-saved] input').click();
                    cy.get('[data-test=secret-reveal-continue]').click();

                    cy.step('the key reads');
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 200);

                    cy.step('a moderator is shown no ban control, and the server refuses the ban');
                    cy.switchUser('moderator');
                    cy.visit(`/en/users/${minterId}`);
                    cy.get('[data-test=user-manage-access]').should('not.exist');
                    loginDevice('moderator').then((device) => {
                        refusedWith(
                            device,
                            'PATCH',
                            `/users/${minterId}`,
                            { active: false },
                            403,
                            'ROLE_MANAGEMENT_REQUIRED'
                        );
                    });
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 200);

                    cy.step('the root administrator bans the minter through the access dialog');
                    cy.switchUser('admin');
                    cy.visit(`/en/users/${minterId}`);
                    cy.intercept('PATCH', '**/users/*').as('ban');
                    cy.get('[data-test=user-manage-access]').click();
                    cy.get('[data-test=user-access-active] input').uncheck({ force: true });
                    cy.get('[data-test=user-access-continue]').click();
                    cy.get('[data-test=user-access-confirm]').click();
                    cy.wait('@ban').its('response.statusCode').should('equal', 200);

                    cy.step('while banned the key reads nothing');
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('not.be.within', 200, 299);

                    cy.step('lifting the ban brings the key back');
                    cy.apiAs('admin', 'PATCH', `/users/${minterId}`, { active: true });
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 200);

                    cy.step('a demoted minter’s key floors to the customer rules they hold now');
                    cy.apiAs('admin', 'PATCH', `/users/${minterId}`, { role: null });
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 403);
                    cy.apiAs('admin', 'PATCH', `/users/${minterId}`, { role: 'admin' });
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 200);

                    cy.step('the ban is on record, written by the administrator');
                    eventually(
                        () =>
                            cy
                                .apiAs<{ items: AuditRowLike[] }>(
                                    'admin',
                                    'GET',
                                    `/audit?target=${minterId}&pageSize=100`
                                )
                                .then((list) => list?.items ?? []),
                        (rows) =>
                            rows.some(
                                (row) =>
                                    row.action === 'admin.user.banned' && row.actorRole === 'admin'
                            )
                    );
                });
        });
    });
});
