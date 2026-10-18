/**
 * Visual regression for the screens that belong to no module — the shell.
 *
 * Every other screen's baseline lives with the module that owns it, at
 * `src/modules/<name>/tests/e2e/__snapshots__/`, so deleting a domain deletes its photographs.
 * What stays here is what has no owner: the landing page, the shop's own prose pages, and the
 * error page a bad URL lands on.
 *
 * Deliberately outside `npm run complete` — see `tests/support/e2e/visual-sweep.ts` for why a
 * pixel diff is a report rather than a gate, and `docs/tools/visual-regression.md` for the five
 * things that have to be frozen for it to mean anything.
 */
import { sweepVisual } from '../../support/e2e/visual-sweep';

sweepVisual('the shell', [
    // Hamburger bar, hero and cards stacking: the phone and tablet are the two layouts that differ.
    {
        name: 'home',
        route: '/en',
        readySelector: '#home-page',
        viewports: ['desktop', 'phone', 'tablet']
    },
    {
        name: 'home',
        route: '/en',
        readySelector: '#home-page',
        viewports: ['phone'],
        theme: 'dark'
    },
    {
        // The drawer exists only below `lg`, so it has no desktop photograph.
        name: 'drawer',
        route: '/en',
        readySelector: '#home-page',
        viewports: ['phone'],
        prepare: () => {
            cy.get('[aria-controls=app-drawer]').click();
            cy.get('#app-drawer').should('be.visible');
            // Visible while it is still sliding in; the scrim fades up after, and a shot taken
            // before it settles has none.
            cy.get('.v-navigation-drawer__scrim').should('have.css', 'opacity', '0.2');
        }
    },
    ['about', '/en/about', '#static-page-about'],
    ['faq', '/en/faq', '#static-page-faq'],
    ['not-found', '/en/this-route-does-not-exist', '#error-page']
]);

// The signed-in header: the cart pinned beside the account menu, count and total on it.
sweepVisual(
    'the shell, signed in',
    [
        // The pinned cart and the account menu share 390 px on a phone.
        {
            name: 'home-signed-in',
            route: '/en',
            readySelector: '#home-page',
            viewports: ['desktop', 'phone']
        }
    ],
    'user'
);

// The longest drawer there is: every staff section on top of the shopper's.
sweepVisual(
    'the shell, staff drawer',
    [
        {
            name: 'drawer, every section',
            route: '/en',
            readySelector: '#home-page',
            viewports: ['phone'],
            prepare: () => {
                cy.get('[aria-controls=app-drawer]').click();
                cy.get('#app-drawer').should('be.visible');
                // Visible while it is still sliding in; the scrim fades up after, and a shot taken
                // before it settles has none.
                cy.get('.v-navigation-drawer__scrim').should('have.css', 'opacity', '0.2');
                cy.get('[data-test=drawer-section-admin]').should('be.visible');
            }
        }
    ],
    'admin'
);

/*
 * Sentinel: the visual run hides scrollbars (`ELECTRON_EXTRA_LAUNCH_ARGS=--hide-scrollbars` in the
 * two visual scripts), so a page that scrolls lays out at the viewport's full width. A phone shot
 * laid out at 375 px under a 15 px bar would be a layout no phone shows.
 */
describe('visual run determinism', () => {
    it('lays a scrolling page out at the full viewport width', () => {
        cy.visit('/en/faq');
        cy.get('#static-page-faq').should('be.visible');
        cy.document().then((document) => {
            expect(document.documentElement.scrollHeight, 'the page scrolls').to.be.greaterThan(
                document.documentElement.clientHeight
            );
            expect(document.documentElement.clientWidth, 'no scrollbar takes width').to.equal(
                Cypress.config('viewportWidth')
            );
        });
    });
});
