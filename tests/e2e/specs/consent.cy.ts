/**
 * The analytics consent banner, end to end: Umami's tag must not load before a yes, a decline
 * must keep it out, and the footer's "Privacy choices" link must let the visitor change their mind.
 *
 * Only meaningful in a build where Umami is configured — otherwise the banner is never shown and
 * every test here skips itself.
 */

/** The tag Umami's loader injects, matched by the attribute only it sets. */
const TRACKER = 'script[data-website-id]';

describe('Analytics consent', () => {
    beforeEach(function () {
        // The global hook answers "denied" for every spec; this one starts as a first-time visitor.
        cy.clearCookies();
        cy.visit('/en');
        cy.get('#home-page').should('exist');
        cy.get('body').then(($body) => {
            if ($body.find('[data-test=analytics-consent-banner]').length === 0) this.skip();
        });
    });

    it('asks first and loads no tracker before an answer', () => {
        cy.get('[data-test=analytics-consent-banner]').should('be.visible');
        cy.get(TRACKER).should('not.exist');
    });

    it('loads the tracker after Accept', () => {
        cy.get('[data-test=analytics-consent-accept]').click();

        cy.get('[data-test=analytics-consent-banner]').should('not.exist');
        cy.get(TRACKER).should('exist');
    });

    it('keeps the tracker out after Decline, across a reload', () => {
        cy.get('[data-test=analytics-consent-decline]').click();
        cy.reload();

        cy.get('[data-test=analytics-consent-banner]').should('not.exist');
        cy.get(TRACKER).should('not.exist');
    });

    it('lets a visitor who accepted withdraw through "Privacy choices"', () => {
        cy.get('[data-test=analytics-consent-accept]').click();
        cy.get('[data-test=privacy-choices-link]').click();
        cy.get('[data-test=analytics-consent-banner]').should('be.visible');

        cy.get('[data-test=analytics-consent-decline]').click();
        cy.window().then((win) => {
            expect(win.localStorage.getItem('umami.disabled')).to.equal('1');
        });
        cy.reload();
        cy.get(TRACKER).should('not.exist');
    });
});
