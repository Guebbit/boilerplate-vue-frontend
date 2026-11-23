/**
 * Typed factory for a catalogue product, proven against the generated response schema as every
 * factory in `tests/support/unit/fixtures.ts` is. Reachable by the modules that depend on
 * `products` (cart, inventory, stock-alerts, wishlist).
 */
import { GetProductByIdResponse } from '@api/schemas';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import type { Product, ProductActions } from '@types';

/**
 * A product's `actions` for nobody in particular: every door closed, what the server sends a guest.
 */
export const NO_PRODUCT_ACTIONS: ProductActions = {
    update: false,
    delete: false,
    restore: false,
    hardDelete: false
};

/**
 * A valid catalogue product — the required fields only, plus whatever a case sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Product` that parses against the generated schema
 */
export const aProduct = (overrides: Partial<Product> = {}): Product => {
    const product = {
        id: 'p1',
        title: 'Walnut desk',
        price: '120.00',
        currency: 'EUR',
        active: true,
        actions: NO_PRODUCT_ACTIONS,
        ...overrides
    };
    return contractBody<Product>(GetProductByIdResponse, product);
};
