/**
 * The keyboard contract of the shell — what axe cannot see.
 *
 * An axe sweep reads the DOM as it stands and asks whether the markup is well-formed: names on
 * controls, roles on widgets, contrast on text. It cannot press a key. Whether the skip link is
 * the FIRST thing Tab reaches, whether focus follows a page change, whether a dialog keeps focus
 * inside it and lets Escape out — these are behaviours, and the only way to test a behaviour is
 * to perform it. This spec does, with real keystrokes.
 *
 * ── Why `cy.realPress()` and not `.type('{tab}')` ────────────────────────────────────────────
 * Cypress simulates keyboard events by dispatching them on an element, and a dispatched Tab
 * moves nothing: focus traversal is the browser's own behaviour, not an event handler's.
 * `cypress-real-events` sends the keystroke through the Chrome DevTools Protocol instead, so the
 * browser performs the traversal exactly as it would for a visitor. The trade is that this runs
 * only in Chromium-family browsers, which is what every `cypress run` here uses.
 *
 * ── What each case protects ──────────────────────────────────────────────────────────────────
 * Every one of these was implemented on purpose, in a place a later edit could quietly undo:
 * the skip link in `LayoutDefault.vue`, the focus move in the router's `afterEach`, the drawer's
 * focus watch in `AppNavigation.vue`, the named icon-only entries in `AppNavIconButton.vue`, the
 * menus in `AppNavMenu.vue`, the dialog in `AppDialogHost.vue`, the chip's role and state in
 * `ProductsList.vue`. None of those files has a unit test that can press Tab either.
 *
 * Runs under the demo profile like every other spec in `ci.yml`.
 */

/** iPhone 14-class portrait: the breakpoint below which the nav collapses into the drawer. */
const PHONE = [390, 844] as const;

/**
 * The tooltip currently showing, by Vuetify's active class rather than by Cypress visibility:
 * tooltip content is `pointer-events: none`, and Cypress reads a fixed element that
 * `elementFromPoint` cannot hit as "covered", i.e. hidden — while axe and a visitor both see it.
 */
const SHOWN_TOOLTIP = '.v-tooltip.v-overlay--active .v-overlay__content';

describe('keyboard', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    it('reaches the skip link on the first Tab, and the skip link lands on the main region', () => {
        cy.visit('/en');
        cy.get('h1').should('exist');

        // "First Tab stop" is DOM order: the first element Tab can reach must be the skip link.
        // Asserted on the document rather than by pressing Tab from a fresh `cy.visit`, where the
        // first real Tab lands on the runner's iframe boundary before it enters the page.
        cy.get('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
            .first()
            .should('have.class', 'skip-link');

        cy.get('.skip-link').focus();
        cy.focused().should('have.class', 'skip-link').and('be.visible');
        cy.focused().realPress('Enter');
        // `<v-main tabindex="-1">`: focusable by the link and by script, never by Tab.
        cy.focused().should('have.attr', 'data-main-content');
    });

    it('moves focus to the main region and retitles the tab after a page change', () => {
        cy.visit('/en');
        cy.get('h1').should('exist');
        cy.title().then((homeTitle) => {
            // A real navigation by a real link, so the router's `afterEach` is what runs.
            // The drawer holds the same link, inert and hidden at this width: the visible one.
            cy.get('nav a[href="/en/products"]').filter(':visible').first().click();
            cy.location('pathname').should('eq', '/en/products');

            cy.focused().should('have.attr', 'data-main-content');
            // The new page's title first, then the app's name — and not the previous page's.
            cy.title().should('not.eq', homeTitle);
            cy.title().should('match', /^Products list — /);
        });
    });

    it('opens the drawer onto its first entry and returns focus to the hamburger on Escape', () => {
        cy.viewport(PHONE[0], PHONE[1]);
        cy.visit('/en');
        cy.get('h1').should('exist');

        cy.get('[aria-controls=app-drawer]').click();
        cy.get('#app-drawer').should('be.visible');
        cy.get('[aria-controls=app-drawer]').should('have.attr', 'aria-expanded', 'true');

        // Focus went INTO the drawer, onto its first entry (WCAG 2.4.3).
        cy.focused().closest('#app-drawer').should('exist');
        cy.get('#app-drawer a, #app-drawer button').first().should('have.focus');

        cy.focused().realPress('Escape');
        cy.get('#app-drawer').should('not.be.visible');
        // ...and came back to the control that opened it, so Tab continues from where it was.
        cy.focused().should('have.attr', 'aria-controls', 'app-drawer');
    });

    /**
     * An icon-only entry shows its name as a tooltip on focus, not only on hover (WCAG 1.4.13),
     * and the tooltip says the same thing the reader hears (WCAG 2.5.3).
     */
    it('shows the label of an icon-only entry as a tooltip on focus', () => {
        cy.visit('/en');
        cy.get('h1').should('exist');

        // By a real Tab, not `.focus()`: the tooltip opens on `:focus-visible`, which a script
        // focus does not set. Skip link → logo → first entry (the hamburger is hidden here).
        cy.get('.skip-link').focus();
        cy.realPress('Tab');
        cy.realPress('Tab');
        cy.focused().should('match', 'nav a');
        cy.focused()
            .invoke('attr', 'aria-label')
            .then((label) => {
                cy.get(SHOWN_TOOLTIP).should('have.length', 1).and('have.text', label);
            });
    });

    it('opens the administration menu with ArrowDown and closes it with Escape', () => {
        cy.loginAs('admin');
        cy.visit('/en');
        cy.get('h1').should('exist');

        cy.get('[data-test=admin-menu]').focus();
        cy.focused().should('have.attr', 'aria-haspopup', 'menu');
        cy.focused().realPress('ArrowDown');
        cy.get('[data-test=admin-menu]').should('have.attr', 'aria-expanded', 'true');
        cy.get('[role=menu] [role=menuitem]').should('exist');

        cy.realPress('Escape');
        cy.get('[data-test=admin-menu]').should('have.attr', 'aria-expanded', 'false');
        // Focus is still on the control that opened it, so Tab continues from where it was.
        cy.focused().should('have.attr', 'data-test', 'admin-menu');
    });

    it('keeps focus inside the confirmation dialog and treats Escape as a decline', () => {
        cy.loginAs('admin');
        // By role: the admin's own pending order is the one the cancel button, and so the
        // confirmation dialog this case is about, exist on.
        cy.orderInRole('cancellable').then((order) => {
            cy.visit(`/en/orders/${order.id}`);
        });
        cy.get('[data-test=order-cancel]').click();
        cy.get('[data-test=app-dialog-message]').should('be.visible');

        // Tab around more times than the dialog has controls: focus must wrap within the
        // overlay, never escape to the page behind it.
        for (let press = 0; press < 4; press += 1) {
            cy.realPress('Tab');
            cy.focused().closest('.v-overlay--active').should('exist');
        }

        cy.realPress('Escape');
        cy.get('[data-test=app-dialog-message]').should('not.exist');
        // Declined, not confirmed: the order is still pending and still cancellable.
        cy.get('[data-test=order-cancel]').should('exist');
    });

    it('toggles a facet chip with Enter and with Space', () => {
        cy.visit('/en/products');
        cy.get('[data-test=category-chip]').should('exist');

        cy.get('[data-test=category-chip]').first().focus();
        cy.focused().realPress('Enter');
        cy.get('[data-test=category-chip]').first().should('have.attr', 'aria-pressed', 'true');

        cy.get('[data-test=category-chip]').first().focus();
        cy.focused().realPress('Space');
        cy.get('[data-test=category-chip]').first().should('have.attr', 'aria-pressed', 'false');
    });
});
