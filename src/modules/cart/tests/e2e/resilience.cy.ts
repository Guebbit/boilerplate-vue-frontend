/**
 * The cart's own share of the shell's resilience sweep (`tests/e2e/specs/resilience.cy.ts`): the
 * cart route renders, logs nothing unexpected and fits the viewport — once empty, once holding a
 * line. It names no value, for the reason the central file gives: a page can log a TypeError or push
 * a table off the screen while every spec that names a price stays green.
 */
import { assertRouteIsHealthy } from '../../../../../tests/support/e2e/resilience';

describe('the cart renders whatever it holds', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('user');
    });

    it('serves an empty cart quietly and inside the viewport', () => {
        cy.apiAs('user', 'DELETE', '/cart/all');
        assertRouteIsHealthy('/en/cart', '#cart-page');
    });

    it('serves a cart holding a line quietly and inside the viewport', () => {
        cy.apiAs('user', 'DELETE', '/cart/all');
        cy.subjectId('product.inStock').then((productId) => {
            cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
        });
        assertRouteIsHealthy('/en/cart', '#cart-page');
        cy.get('[data-test=cart-item]').should('have.length', 1);
    });
});
