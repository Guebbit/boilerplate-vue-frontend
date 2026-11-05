/**
 * @module
 * Who may open the cart: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('cart', [
    {
        // The page asks no rule: every signed-in account shops, the operator included. The sweep
        // wants one, and every persona it walks is verified, so `checkout:Cart` admits them all.
        name: 'cart',
        route: '/en/cart',
        can: ['checkout', 'Cart'],
        pageRoot: '#cart-page'
    }
]);
