// requires-module: feedback, products
/**
 * @module
 * VI2 · Find your way around. A guest who has never signed in moves about the shop the way people
 * do: the nav's Home link and the logo, the footer's prose pages, the FAQ's way to the contact form,
 * the About page on to the catalogue. They flip the theme and reload, type a locale the shop does not
 * speak, hit a page that does not exist, and follow a link to a product that has since been pulled.
 *
 * Every link is taken by its `href` or its `data-test`, never by its label, and every landing is
 * asserted by the page's own id. The last step is the bug this journey carries a fix for: a record
 * the API says is gone used to leave the product page on its loading placeholders for good.
 */

/** The four prose pages the footer links, with the id each page renders. */
const STATIC_PAGES = [
    ['about', '#static-page-about'],
    ['faq', '#static-page-faq'],
    ['terms', '#static-page-terms'],
    ['privacy', '#static-page-privacy']
] as const;

describe('VI2 · Find your way around', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('every link lands where it says, the theme is kept, and a wrong address gets an honest page', () => {
        cy.step('the Home link and the logo both lead home');
        cy.navigateTo('/en/products');
        cy.get('#products-list-page').should('exist');
        cy.navigateTo('/en');
        cy.get('#home-page').should('exist');
        cy.navigateTo('/en/contact');
        cy.get('#contact-page').should('exist');
        cy.get('header a[href="/en"]:has(img)').click();
        cy.get('#home-page').should('exist');

        cy.step('the footer reaches each prose page');
        for (const [page, anchor] of STATIC_PAGES) {
            cy.get(`footer a[href="/en/${page}"]`).click();
            cy.get(anchor).should('exist');
            cy.location('pathname').should('equal', `/en/${page}`);
        }

        cy.step('the FAQ offers the contact form, and the About page leads on to the catalogue');
        cy.get('footer a[href="/en/faq"]').click();
        cy.get('[data-test=faq-contact] a').click();
        cy.get('#contact-page').should('exist');
        cy.navigateTo('/en/about');
        cy.get('#static-page-about').should('exist');
        cy.navigateTo('/en/products');
        cy.get('#products-list-page').should('exist');

        cy.step('the theme toggle flips the theme, and a reload keeps it');
        cy.get('[data-test=theme-toggle]').click();
        cy.get('.v-application.v-theme--dark').should('exist');
        cy.reload();
        cy.get('#products-list-page').should('exist');
        cy.get('.v-application.v-theme--dark').should('exist');

        cy.step('a locale the shop does not speak falls back to English, keeping the path');
        cy.visit('/xx/products');
        cy.location('pathname').should('equal', '/en/products');
        cy.get('#products-list-page').should('exist');

        cy.step('an address with no locale keeps its path');
        cy.visit('/products');
        cy.location('pathname').should('equal', '/en/products');
        cy.get('#products-list-page').should('exist');

        cy.step('a page that does not exist says so, and its Home button works');
        cy.visit('/en/no-such-page');
        cy.get('#error-page').should('exist');
        cy.location('pathname').should('equal', '/en/error/404/error-page.not-found');
        cy.get('#error-page a[href="/en"]').click();
        cy.get('#home-page').should('exist');

        cy.step('a product pulled from the shop is a not-found page, not a page stuck loading');
        cy.subjectId('product.softDeleted').then((id) => {
            cy.visit(`/en/products/${id}`);
        });
        cy.get('#error-page').should('exist');
        cy.location('pathname').should('equal', '/en/error/404/error-page.not-found');
        cy.get('#product-target').should('not.exist');
    });
});
