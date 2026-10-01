// requires-module: api-keys, users, webhooks
/**
 * @module
 * IN2 · Banning the person bans their keys. A second admin mints a read key; the moderator bans
 * that admin; the key authenticates nothing until the admin is unbanned, and then works again.
 *
 * A key is never a copy of its minter's rights: the backend re-derives them on every request. So
 * the ban needs no sweep over the keys, and the answer is a 403 (the key is still recognised, it
 * just holds nothing) rather than a 401.
 */
import { loginDeviceWith, requestAsDevice, requestWithKey } from '../../../support/e2e/harness';

/** The second admin: the seeded one is the page's own session, and must stay untouched. */
const MINTER = {
    email: `in2-minter-${String(Date.now())}@example.com`,
    username: 'in2-minter',
    password: 'Minter-Passw0rd!x'
};

/** The one read the key is given. */
const GIVEN = 'webhooks.any.read';

/**
 * Switches an account off or on through the user's own edit form, as the signed-in moderator.
 *
 * @param userId - whose account
 * @param active - `false` bans, `true` unbans
 */
const setActiveInTheForm = (userId: string, active: boolean): void => {
    cy.visit(`/en/users/${userId}/edit`);
    cy.get('[data-test=user-edit-email] input').should('have.value', MINTER.email);
    if (active) cy.get('[data-test=user-edit-active] input').check({ force: true });
    else cy.get('[data-test=user-edit-active] input').uncheck({ force: true });
    cy.intercept('PATCH', '**/users/*').as('save');
    cy.get('form').submit();
    // A change of access asks once before it is sent.
    cy.get('[data-test=user-access-confirm]').click();
    cy.wait('@save').its('response.statusCode').should('equal', 200);
    cy.get('[data-test=user-edit-submit-error]').should('not.exist');
};

describe('IN2 · Banning the person bans their keys', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a banned minter leaves the key authenticating nothing, and unbanning gives it back', () => {
        cy.step('a second admin exists and mints a read key');
        cy.apiAs<{ id: string }>('admin', 'POST', '/users', {
            email: MINTER.email,
            username: MINTER.username,
            password: MINTER.password,
            role: 'admin'
        }).then((minter) => {
            if (!minter) throw new Error('IN2: creating the second admin answered no user');
            loginDeviceWith(MINTER.email, MINTER.password).then((device) => {
                requestAsDevice(device, 'POST', '/api-keys', {
                    name: 'in2 reader',
                    permissions: [GIVEN]
                }).then((minted) => {
                    expect(minted.status, 'the mint').to.equal(201);
                    const { secret } = (minted.body as { data: { secret: string } }).data;
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 200);

                    cy.step('the moderator bans the minter in the user form');
                    cy.loginAs('moderator');
                    setActiveInTheForm(minter.id, false);

                    cy.step('the key is still recognised, and holds nothing');
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 403);

                    cy.step('unbanning gives it back, with no new key');
                    setActiveInTheForm(minter.id, true);
                    requestWithKey(secret, 'GET', '/webhooks/subscriptions')
                        .its('status')
                        .should('equal', 200);
                });
            });
        });
    });
});
