/**
 * Orders — public barrel.
 *
 * The only surface a sibling module may import. See any sibling's barrel for the rule.
 *
 * `useOrdersStore` is here for the cart's checkout, which turns a cart into an order and is the
 * one cross-module call in this build.
 */

export { useOrdersStore } from './store';
export { ordersSchema, ordersStatusSchema } from './schemas';
