// requires-module: account, cart, inventory, orders, payments, products
/**
 * @module
 * OP21 · The stock counters follow an order. One product with five units on the shelf: a customer
 * checks out two (they are held: reserved, not yet gone), the order is paid (the units are sold),
 * a second order is placed and cancelled (held, then released), and the administrator writes the
 * rest off. At each step the board's on-hand, reserved and available counts say what the order
 * did, the ledger names the movement and links it to the order, and a guest who looked at the
 * product before sees "out of stock" the moment it is true.
 *
 * Staff read the live counters; a guest's product page is cached, and a stock write clears that
 * cache. With no cache (the demo backend) the last step is trivially true; with Redis and a
 * production-sized TTL it is the story's real test.
 */

/** Units on the shelf at the start, taken by the first order, and by the second. */
const SHELF = 5;
const FIRST_ORDER = 2;
const SECOND_ORDER = 1;

/** What the board shows for the product: on hand, reserved, available. */
type Counts = [onHand: number, reserved: number, available: number];

/** The slice of an order this story reads. */
interface OrderLike {
    id: string;
}

/**
 * Picks a product in the ledger's autocomplete by typing its title.
 *
 * @param title - the product's title
 */
const pickLedgerProduct = (title: string): void => {
    // Cleared first: the filter holds "All products" as its text until something else is chosen.
    cy.get('[data-test=movements-filter-product] input').clear();
    cy.get('[data-test=movements-filter-product] input').type(title);
    cy.get('[role=listbox] [role=option]').contains(title).click();
};

/**
 * Reloads the inventory page and asserts the board's three counts for the product.
 *
 * @param title - the product's title
 * @param expected - on hand, reserved and available
 */
const boardShows = (title: string, expected: Counts): void => {
    cy.visit('/en/inventory');
    cy.contains('[data-test=level-row]', title)
        .find('td')
        .should(($cells) => {
            const counts = [1, 2, 3].map((index) => Number($cells.eq(index).text().trim()));
            expect(counts, 'on hand, reserved, available').to.deep.equal(expected);
        });
};

/**
 * The customer places an order for some units, paying nothing yet: pickup, so no address.
 *
 * @param productId - the product
 * @param quantity - how many units
 * @returns a chain yielding the order's id
 */
const placeOrder = (productId: string, quantity: number): Cypress.Chainable<string> => {
    cy.apiAs('user', 'POST', '/cart', { productId, quantity });
    cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
    return cy.apiAs<OrderLike>('user', 'POST', '/cart/checkout', {}).then((order) => {
        if (!order) throw new Error('OP21: the checkout answered no order');
        return order.id;
    });
};

describe('OP21 · The stock counters follow an order', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('reserve, sold, released and written off each move the counts and name their order, and a guest sees the end of stock at once', () => {
        const title = `E2E OP21 ${String(Date.now())}`;
        cy.createProduct({ title, onHand: SHELF }).then((product) => {
            cy.step('a guest looks at the product while it is in stock');
            cy.visit(`/en/products/${product.id}`);
            cy.get('[data-test=product-stock]').should('not.contain.text', 'Out of stock');

            cy.step('the shelf is full: nothing held');
            cy.loginAs('admin');
            boardShows(title, [SHELF, 0, SHELF]);

            cy.step('the customer checks out two units: they are held, not gone');
            placeOrder(product.id, FIRST_ORDER).as('first');
            boardShows(title, [SHELF, FIRST_ORDER, SHELF - FIRST_ORDER]);

            cy.step('the order is paid: the held units are sold');
            cy.get<string>('@first').then((orderId) => {
                cy.apiAs('admin', 'POST', `/payments/order/${orderId}/offline`, {
                    method: 'cash'
                });
            });
            boardShows(title, [SHELF - FIRST_ORDER, 0, SHELF - FIRST_ORDER]);

            cy.step('a second order is placed and then cancelled: held, then released');
            placeOrder(product.id, SECOND_ORDER).as('second');
            boardShows(title, [
                SHELF - FIRST_ORDER,
                SECOND_ORDER,
                SHELF - FIRST_ORDER - SECOND_ORDER
            ]);
            cy.get<string>('@second').then((orderId) => {
                cy.apiAs('user', 'POST', `/orders/${orderId}/cancel`);
            });
            boardShows(title, [SHELF - FIRST_ORDER, 0, SHELF - FIRST_ORDER]);

            cy.step('the administrator writes the rest off');
            cy.get('[data-test=adjust-product] input').clear();
            cy.get('[data-test=adjust-product] input').type(title);
            cy.get('[role=listbox] [role=option]').contains(title).click();
            cy.get('[data-test=adjust-delta] input').clear();
            cy.get('[data-test=adjust-delta] input').type(String(-(SHELF - FIRST_ORDER)));
            cy.get('[data-test=adjust-note] input').type('OP21 stocktake');
            cy.get('[data-test=adjust-submit]').click();
            cy.get('[data-test=adjust-error]').should('not.exist');
            boardShows(title, [0, 0, 0]);

            cy.step(
                'the ledger names every movement, oldest to newest, each order on its own rows'
            );
            pickLedgerProduct(title);
            cy.get('[data-test=movement-reason]').should(($reasons) => {
                const newestFirst = $reasons.toArray().map((reason) => reason.textContent?.trim());
                expect(newestFirst.toReversed()).to.deep.equal([
                    'Received',
                    'Reserved',
                    'Sold',
                    'Reserved',
                    'Released',
                    'Adjusted'
                ]);
            });
            for (const alias of ['first', 'second']) {
                cy.get<string>(`@${alias}`).then((orderId) => {
                    // Each order is held, then sold or released: two rows.
                    cy.get(`[data-test=movement-row]:has(a[href$="/orders/${orderId}"])`).should(
                        'have.length',
                        2
                    );
                });
            }

            cy.step('the guest’s page says out of stock at once');
            cy.logout();
            cy.visit(`/en/products/${product.id}`);
            cy.get('[data-test=product-stock]').should('contain.text', 'Out of stock');
        });
    });
});
