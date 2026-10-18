// requires-module: account, api-keys, users
/**
 * @module
 * OP32 · People and keys ask a fresh session. Handing out a role, creating an
 * account with a role and minting an API key all ask the administrator for the password once the
 * sign-in is older than five minutes (the critical window). Editing a phone and revoking a key do
 * not. (Taking a role away through the access dialog sends an empty role, which the route reads
 * as naming none, so it is not walked here.) The dialog opens in the middle of the action: a wrong
 * password keeps it up, the right one carries on with the same action once.
 *
 * Time passes by moving the demo backend's clock, so this is a demo-only journey. Each jump is
 * past the window and inside the staff idle limit, which the requests between jumps reset.
 */
import { datetimeLocalIn } from '../../../support/e2e/integrator';
import { eventually } from '../../../support/e2e/steps';

/** Past the critical window (300 s), inside the access token's own life (600 s). */
const PAST_CRITICAL_MS = 400_000;

/** One day, in milliseconds: how long the minted key lives. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** The slice of a user this story reads. */
interface UserLike {
    role?: string;
}

/**
 * The dialog is up: a wrong password keeps it up, then the administrator's real one closes it.
 */
const wrongThenRight = (): void => {
    cy.get('[data-test=reauth-dialog]').should('be.visible');
    cy.get('[data-test=reauth-dialog-password] input').type('not-the-password');
    cy.get('[data-test=reauth-dialog-submit]').click();
    cy.get('[data-test=reauth-dialog-password] .v-messages__message').should('exist');
    cy.get('[data-test=reauth-dialog]').should('be.visible');
    cy.get('[data-test=reauth-dialog-password] input').clear();
    cy.accountOf('admin').then(({ password }) => {
        cy.get('[data-test=reauth-dialog-password] input').type(password);
    });
    cy.get('[data-test=reauth-dialog-submit]').click();
    cy.get('[data-test=reauth-dialog]').should('not.exist');
};

/**
 * Opens a person's access dialog, picks a role option by its label and confirms.
 *
 * @param userId - whose role
 * @param label - the option's visible label
 */
const pickRole = (userId: string, label: string | RegExp): void => {
    cy.visit(`/en/users/${userId}`);
    cy.get('[data-test=user-manage-access]').click();
    cy.pickOption('[data-test=user-access-role]', label);
    cy.get('[data-test=user-access-continue]').click();
    cy.get('[data-test=user-access-confirm]').click();
};

describe('OP32 · People and keys ask a fresh session', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a role grant, an account with a role and a key each ask; a phone and a revoke do not', () => {
        cy.skipUnlessDemo();

        cy.accountInRole('unverified').then(({ id: targetId }) => {
            cy.step('the administrator signs in, and the sign-in grows stale');
            cy.loginAs('admin');
            cy.travel(PAST_CRITICAL_MS);

            cy.step('granting a role asks; the right password grants it once');
            pickRole(targetId, 'warehouse');
            wrongThenRight();
            eventually(
                () => cy.apiAs<UserLike>('admin', 'GET', `/users/${targetId}`),
                (user) => user?.role === 'warehouse'
            );

            cy.step('editing the same person’s phone never asks');
            cy.travel(PAST_CRITICAL_MS);
            cy.visit(`/en/users/${targetId}/edit`);
            cy.get('[data-test=user-edit-phone] input').should('exist');
            cy.get('[data-test=user-edit-phone] input').clear();
            cy.get('[data-test=user-edit-phone] input').type('+39 02 0000 1111');
            cy.get('#user-edit-page form').submit();
            cy.get('[data-test=reauth-dialog]').should('not.exist');

            cy.step('creating an account with a role asks');
            cy.travel(PAST_CRITICAL_MS);
            cy.visit('/en/users/create');
            cy.get('[data-test=user-email] input').type('op32-staff@example.test');
            cy.get('[data-test=user-username] input').type('op32staff');
            cy.pickOption('[data-test=user-role]', 'warehouse');
            cy.get('#user-create-page form').submit();
            wrongThenRight();
            cy.location('pathname').should('match', /\/en\/users\/[\da-f]{24}$/);

            cy.step('minting a key asks, and the secret is shown once after the password');
            cy.travel(PAST_CRITICAL_MS);
            cy.visit('/en/api-keys/create');
            cy.get('[data-test=api-key-name] input').type('op32-reader');
            cy.get('[data-test=api-key-permissions] input').type('read:WebhookSubscription{enter}');
            cy.get('[data-test=api-key-expires-at] input').type(datetimeLocalIn(DAY_MS));
            cy.get('form').submit();
            wrongThenRight();
            cy.get('[data-test=secret-reveal-value]')
                .invoke('text')
                .then((text) => {
                    expect(text.trim(), 'a secret key').to.match(/^sk_/);
                });
            cy.get('[data-test=secret-reveal-confirm-saved] input').click();
            cy.get('[data-test=secret-reveal-continue]').click();

            cy.step('revoking a key never asks, however old the sign-in');
            cy.travel(PAST_CRITICAL_MS);
            cy.visit('/en/api-keys');
            cy.contains('[data-test=list-row]', 'op32-reader').within(() => {
                cy.get('[data-test=row-revoke]').click();
            });
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=reauth-dialog]').should('not.exist');
            cy.contains('[data-test=list-row]', 'op32-reader').within(() => {
                cy.get('[data-test=api-key-status]').should('have.attr', 'data-status', 'revoked');
            });
        });
    });
});
