// requires-module: account
/**
 * @module
 * AC25 · What I agreed to. The signup form shows how strong the password is, refuses an account
 * whose terms box is empty, and records what was agreed with a time and a version: the terms and,
 * when ticked, the analytics choice. Turning the analytics switch off moves its date. A provider
 * signup stamps the terms too, and asks nothing about analytics.
 *
 * Reads the record from `GET /account`, which does not depend on an analytics build (AC12 and
 * VI4 skip on every push without Umami). The provider part is demo only: `fake` is a demo double.
 */
import { loginDeviceWith } from '../../../support/e2e/security-steps';
import type { Device } from '../../../support/e2e/harness';
import { requestAsDevice } from '../../../support/e2e/harness';

/** The new customer. */
const VISITOR = { email: 'what.i.agreed@example.com', password: 'Agreed_To_This1!' };

/** The slice of the account record this story reads. */
interface Agreement {
    analyticsConsent?: boolean;
    analyticsConsentAt?: string | null;
    termsAcceptedAt?: string | null;
    termsVersion?: string | null;
}

/**
 * Reads the agreement fields off the account as another device sees it.
 *
 * @param device - a signed-in device of the account
 * @returns a chain yielding the fields
 */
const agreementOf = (device: Device): Cypress.Chainable<Agreement> =>
    requestAsDevice(device, 'GET', '/account').then(
        // The body is `unknown`; these are the fields the story reads off it.
        (response) => (response.body as { data: Agreement }).data
    );

describe('AC25 · What I agreed to', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the strength, refuses a missing box, and records the terms and the analytics choice with a date', () => {
        cy.step('the strength meter follows what is typed');
        cy.visit('/en/signup');
        cy.get('[type=password]').eq(0).should('not.be.disabled').type('abc');
        cy.get('[data-test=password-strength-meter]').invoke('text').should('match', /weak/i);
        cy.get('[type=password]').eq(0).clear();
        cy.get('[type=password]').eq(0).type(VISITOR.password);
        cy.get('[data-test=password-strength-meter]')
            .invoke('text')
            .should('match', /strong|good/i);

        cy.step('without the terms box no account is made, and the form says why');
        cy.intercept('POST', '**/account/signup').as('signup');
        cy.get('[type=email]').should('not.be.disabled').type(VISITOR.email);
        cy.get('[type=password]').eq(1).type(VISITOR.password);
        cy.get('#signup-page button[type="submit"]').click();
        cy.get('[data-test=signup-terms-accepted] .v-messages__message').should(
            'contain.text',
            'You must accept the Terms of Service'
        );
        cy.get('@signup.all').should('have.length', 0);
        cy.get('#home-page').should('not.exist');

        cy.step('with the terms and analytics ticked the account is made and dated');
        cy.get('[data-test=signup-analytics-consent] input[type=checkbox]').check({ force: true });
        cy.get('[data-test=signup-terms-accepted] input[type=checkbox]').check();
        cy.get('#signup-page button[type="submit"]').click();
        cy.get('#home-page').should('exist');
        loginDeviceWith(VISITOR.email, VISITOR.password).then((device) => {
            agreementOf(device).then((agreed) => {
                expect(agreed.analyticsConsent, 'analytics ticked').to.equal(true);
                expect(Date.now() - Date.parse(String(agreed.analyticsConsentAt))).to.be.within(
                    -60_000,
                    60_000
                );
                expect(agreed.termsAcceptedAt, 'the terms were stamped').to.be.a('string');
                expect(agreed.termsVersion, 'with the version agreed to').to.be.a('string');

                cy.step('turning the analytics switch off moves its date');
                cy.visit('/en/profile');
                cy.get('#profile-page [type=email]').should('have.value', VISITOR.email);
                cy.get('[data-test=profile-analytics-consent] input').should('be.checked');
                cy.get('[data-test=profile-analytics-consent] input').uncheck({ force: true });
                cy.get('#profile-page form button[type=submit]')
                    .first()
                    .should('not.be.disabled')
                    .click();
                cy.get('#profile-page form button[type=submit]').first().should('be.disabled');
                agreementOf(device).then((later) => {
                    expect(later.analyticsConsent, 'analytics off').to.equal(false);
                    expect(Date.parse(String(later.analyticsConsentAt))).to.be.greaterThan(
                        Date.parse(String(agreed.analyticsConsentAt))
                    );
                    expect(later.termsAcceptedAt, 'the terms date did not move').to.equal(
                        agreed.termsAcceptedAt
                    );
                });
            });
        });
    });

    it('a provider signup stamps the terms and asks nothing about analytics', () => {
        cy.skipUnlessDemo();

        cy.step('the notice stands beside the provider button');
        cy.visit('/en/login');
        cy.get('[data-test=oauth-terms-notice]').should('be.visible');
        cy.get('[data-test=oauth-fake]').should('exist');

        cy.step('an unknown identity signs up through it');
        cy.intercept('GET', '**/account').as('account');
        cy.get('[data-test=oauth-fake]').click();
        cy.get('#home-page').should('exist');
        cy.visit('/en/profile');

        cy.step('the record carries the terms and no analytics answer');
        cy.wait('@account')
            .its('response.body.data')
            .should((agreed: Agreement) => {
                expect(agreed.termsAcceptedAt, 'the terms were stamped').to.be.a('string');
                expect(agreed.termsVersion, 'with the version').to.be.a('string');
                expect(agreed.analyticsConsentAt ?? null, 'nothing asked about analytics').to.equal(
                    null
                );
            });
    });
});
