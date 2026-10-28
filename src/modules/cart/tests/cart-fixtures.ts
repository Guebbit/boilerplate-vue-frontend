/**
 * Typed cart factory for the specs that interleave cart answers by hand.
 *
 * A cart is built from its lines, so two carts in one test differ only by what the test changed,
 * and every total follows from the lines: a spec that asserts "this is the cart the server last
 * answered" compares whole carts, never a hand-copied number.
 */
import type { CartResponse } from '@types';

/**
 * The price every fixture line carries, so a total is `units * UNIT_PRICE`.
 */
export const UNIT_PRICE = 10;

/**
 * The per-line ceiling a fixture cart is built against, as the server's default sets it.
 */
const LINE_MAX = 10;

/**
 * The shipping a priced cart offers: two methods, one needing an address.
 */
const SHIPPING_OPTIONS: CartResponse['shipping']['options'] = [
    { id: 'standard', price: 5, requiresAddress: true, tracked: false },
    { id: 'pickup', price: 0, requiresAddress: false, tracked: false }
];

/**
 * A valid cart as `GET /cart` answers it, whose summary agrees with its lines.
 *
 * @param lines - `[productId, quantity]` pairs, in the order the cart lists them
 * @param selected - The shipping method the cart plans to ship by, or none; the request's own `null` (a clear) reads as none, as the server answers it
 * @param short - Ids of the lines the server names `insufficient_stock`
 * @returns A `CartResponse` that parses against the generated schema
 */
export const aCart = (
    lines: [string, number][],
    selected?: string | null,
    short: readonly string[] = []
): CartResponse => {
    const totalQuantity = lines.reduce((sum, [, quantity]) => sum + quantity, 0);
    const shippingCost = selected === 'standard' ? 5 : 0;
    return {
        items: lines.map(([productId, quantity]) => ({
            productId,
            quantity,
            availability: short.includes(productId) ? 'insufficient_stock' : 'in_stock',
            canIncrease: quantity < LINE_MAX
        })),
        summary: {
            itemsCount: lines.length,
            totalQuantity,
            itemsTotal: totalQuantity * UNIT_PRICE,
            shippingCost,
            totalPrice: totalQuantity * UNIT_PRICE + shippingCost,
            currency: 'EUR',
            expectedTotal: {
                amount: (totalQuantity * UNIT_PRICE + shippingCost) * 100,
                currency: 'EUR'
            }
        },
        shipping: {
            required: lines.length > 0,
            ...(typeof selected === 'string' ? { selected } : {}),
            options: lines.length > 0 ? SHIPPING_OPTIONS : []
        },
        checkoutable: lines.length > 0 && short.length === 0
    };
};
