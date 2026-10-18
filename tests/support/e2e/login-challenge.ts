/// <reference types="cypress" />

/**
 * Answers the two-factor challenge page with the code an authenticator app would show.
 *
 * @param totpSecret - the account's base32 authenticator secret
 */
export const answerChallengePage = (totpSecret: string) => {
    cy.get('#two-factor-challenge-page').should('exist');
    cy.env(['apiUrl']).then(({ apiUrl }) => {
        cy.task<string>('loginTotpCode', { secret: totpSecret, apiUrl: String(apiUrl) }).then(
            (code) => {
                cy.get('[data-test=two-factor-challenge-code] input').type(code);
            }
        );
    });
    cy.get('[data-test=two-factor-challenge-submit]').click();
};
