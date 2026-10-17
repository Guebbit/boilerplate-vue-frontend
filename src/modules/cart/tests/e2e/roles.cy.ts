/**
 * @module
 * Who may open the cart: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('cart', [
    {
        // Every signed-in account shops, the operator included.
        name: 'cart',
        route: '/en/cart',
        can: ['update', 'Cart'],
        pageRoot: '#cart-page'
    }
]);
