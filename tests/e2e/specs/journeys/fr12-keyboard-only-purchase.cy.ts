// requires-module: account, cart, orders, payments, products
/**
 * @module
 * FR12 · A keyboard-only purchase. The shopper never touches the mouse: from the bar's Products
 * link to a cancelled, refunded order, every control is reached with Tab (or Shift+Tab, when the
 * control sits earlier in the page) and worked with Enter, Space, the arrow keys and Escape.
 *
 * What is proved is reachability and the two dialog contracts: a dialog takes focus in, keeps it
 * inside, and gives it back to the control that opened it on Escape. The shopper is the pending-email
 * customer with its seeded book emptied through the API, so the checkout offers the address
 * dialog (a seeded book would hide it).
 *
 * Sign-in is the one step done the ordinary way: the form is not what this story is about.
 */

/** The most key presses allowed to reach one control: a page has far fewer stops than this. */
const MAX_PRESSES = 60;

/** A chainable that yields the one element a step is aiming at. */
type Target = () => Cypress.Chainable<JQuery>;

/**
 * Says where focus is, for the trail a failure prints.
 *
 * @param element - the focused element, or `null` when nothing is
 */
const describeFocus = (element: Element | null): string => {
    if (!element) return 'nothing';
    // A cast, not `instanceof`: the page is another window's document, so `instanceof` would lie.
    const name =
        (element as HTMLElement).dataset.test ??
        element.getAttribute('href') ??
        (element.getAttribute('class') ?? '').slice(0, 30);
    return `${element.tagName.toLowerCase()}[${name}]`;
};

/**
 * Moves focus onto a control with the keyboard alone, pressing Tab when the control comes later in
 * the page and Shift+Tab when it comes earlier, and fails if it is not reached in a sane number of
 * presses. The control itself must be the focusable element, not a wrapper around it.
 *
 * @param label - what the control is called, for the failure message
 * @param target - looks the control up afresh on every press, since the page re-renders
 */
const focusVia = (label: string, target: Target): void => {
    const trail: string[] = [];
    const press = (): void => {
        target().then(($target) => {
            cy.document().then((page) => {
                const [control] = $target;
                const active = page.activeElement;
                if (active === control) return;
                trail.push(describeFocus(active));
                if (trail.length > MAX_PRESSES)
                    throw new Error(
                        `keyboard: "${label}" not reached. Focus went: ${trail.slice(-12).join(' > ')}`
                    );
                const later =
                    !active ||
                    (active.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING) !==
                        0;
                cy.realPress(later ? 'Tab' : ['Shift', 'Tab']);
                press();
            });
        });
    };
    press();
};

/**
 * Reaches a control by `data-test` and activates it with Enter.
 *
 * @param selector - selector of the focusable control
 */
const enterOn = (selector: string): void => {
    focusVia(selector, () => cy.get(selector).filter(':visible').first());
    cy.focused().realPress('Enter');
};

/**
 * The focus is somewhere inside the open dialog.
 *
 * @param selector - the dialog's own selector
 */
const focusIsIn = (selector: string): void => {
    cy.document().should((page) => {
        // Vuetify focuses the overlay's own content box on open, which is the dialog card's parent.
        const box = page.querySelector(selector)?.closest('.v-overlay__content');
        expect(
            box?.contains(page.activeElement),
            `focus is inside ${selector}, it is on ${describeFocus(page.activeElement)}`
        ).to.equal(true);
    });
};

describe('FR12 · A keyboard-only purchase', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('buys, pays for and cancels an order without the mouse', () => {
        cy.step('the book is emptied, then the shopper signs in and reaches Products with Tab');
        cy.apiAs<{ addresses: { id: string }[] }>('pendingEmail', 'GET', '/account/addresses').then(
            (book) => {
                for (const { id } of book?.addresses ?? [])
                    cy.apiAs('pendingEmail', 'DELETE', `/account/addresses/${id}`);
            }
        );
        cy.loginAs('pendingEmail');
        enterOn('header nav a[href="/en/products"]');
        cy.location('pathname').should('equal', '/en/products');

        cy.step('a category chip, then the product card, are reached and opened');
        // The narrowest shelf the product is on, so its card is on the first page of the result.
        cy.subjectProduct('product.rich').then((product) => {
            cy.publicProducts().then((products) => {
                const shelves = (product.categories ?? []).map((category) => ({
                    category,
                    count: products.filter((other) => other.categories?.includes(category)).length
                }));
                const [narrowest] = shelves.toSorted((first, second) => first.count - second.count);
                const label = new RegExp(String.raw`^\s*${narrowest?.category ?? ''} \(\d+\)\s*$`);
                focusVia('the category chip', () =>
                    cy
                        .get('[data-test=category-chip]')
                        .filter((_, chip) => label.test(chip.textContent))
                        .first()
                );
                cy.focused().realPress('Enter');
            });
        });
        cy.subjectId('product.rich').then((id) => {
            enterOn(`[data-test=product-card-link][href$="/${id}"]`);
        });
        cy.get('[data-test=add-to-cart]').should('exist');

        cy.step('add to cart, then the bar cart button');
        cy.intercept('POST', '**/cart').as('addToCart');
        enterOn('[data-test=add-to-cart]');
        cy.wait('@addToCart');
        enterOn('[data-test=pinned-Cart]');
        cy.location('pathname').should('equal', '/en/cart');

        cy.step('a shipping method that needs an address, chosen with Space');
        focusVia('[data-test=shipping-method-standard] input', () =>
            cy.get('[data-test=shipping-method-standard] input')
        );
        cy.focused().realPress('Space');
        cy.get('[data-test=shipping-method-standard] input').should('be.checked');

        cy.step('the address dialog takes focus, gives it back on Escape, and is filled with keys');
        enterOn('[data-test=address-picker-add]');
        cy.get('[data-test=address-dialog]').should('be.visible');
        focusIsIn('[data-test=address-dialog]');
        cy.focused().realPress('Escape');
        cy.get('[data-test=address-dialog]').should('not.exist');
        cy.focused().should('have.attr', 'data-test', 'address-picker-add');
        cy.focused().realPress('Enter');
        cy.get('[data-test=address-dialog]').should('be.visible');
        const fields = ['Home', 'Ada Keys', '1 Tab Street', '20100', 'Milan'];
        for (const [index, value] of fields.entries()) {
            focusVia('[data-test=address-dialog] input', () =>
                cy.get('[data-test=address-dialog] input').eq(index)
            );
            cy.focused().realType(value);
        }
        focusVia('[data-test=address-country] input', () =>
            cy.get('[data-test=address-country] input')
        );
        cy.focused().realType('Italy');
        // Arrow into the list only once it is shown: a list still fading in cannot take focus.
        cy.get('.v-overlay--active [role=option]').first().should('be.visible');
        cy.focused().realPress('ArrowDown');
        cy.focused().realPress('Enter');
        enterOn('[data-test=address-save]');
        cy.get('[data-test=address-dialog]').should('not.exist');

        cy.step('the payment method, then Place order, are reached and used');
        focusVia('[data-test=payment-method-card] input', () =>
            cy.get('[data-test=payment-method-card] input')
        );
        cy.focused().realPress('Space');
        cy.get('[data-test=payment-method-card] input').should('be.checked');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');
        focusVia('[data-test=cart-checkout]', () => cy.get('[data-test=cart-checkout]'));
        cy.focused().realPress('Enter');
        cy.get('#order-target').should('exist');

        cy.step('the card is chosen from the list with the arrow keys and paid');
        focusVia('[data-test=payment-method-select] input', () =>
            cy.get('[data-test=payment-method-select] input')
        );
        cy.focused().realPress('Enter');
        cy.get('[role=listbox] [role=option]').then(($options) => {
            const index = $options
                .toArray()
                .findIndex((option) => option.textContent?.includes('Card that pays'));
            for (let press = 0; press <= index; press += 1) cy.focused().realPress('ArrowDown');
        });
        cy.focused().realPress('Enter');
        enterOn('[data-test=payment-submit]');
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');

        cy.step('the cancel dialog keeps focus inside, returns it on Escape, then confirms');
        enterOn('[data-test=order-cancel]');
        cy.get('[data-test=app-dialog]').should('be.visible');
        focusIsIn('[data-test=app-dialog-message]');
        for (let press = 0; press < 4; press += 1) {
            cy.focused().realPress('Tab');
            focusIsIn('[data-test=app-dialog-message]');
        }
        cy.focused().realPress('Escape');
        cy.get('[data-test=app-dialog]').should('not.exist');
        cy.focused().should('have.attr', 'data-test', 'order-cancel');
        cy.focused().realPress('Enter');
        enterOn('[data-test=app-dialog-confirm]');
        cy.get('[data-test=order-cancel]').should('not.exist');
        // The refund is the payments module answering the cancel, a beat later; a reload reads it.
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
        cy.reload();
        cy.get('[data-test=payment-status]', { timeout: 20_000 }).should(
            'contain.text',
            'Refunded'
        );
    });
});
