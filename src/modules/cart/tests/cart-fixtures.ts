/**
 * Typed cart factory for the specs that interleave cart answers by hand.
 *
 * A cart is built from its lines, so two carts in one test differ only by what the test changed,
 * and every total follows from the lines: a spec that asserts "this is the cart the server last
 * answered" compares whole carts, never a hand-copied number.
 */
import type { CartResponse } from '@types';
import { multiplyDecimal, sumDecimals } from '@/infrastructure/utils/money.ts';

/**
 * The price every fixture line carries, so a total is `units × UNIT_PRICE`.
 */
export const UNIT_PRICE = '10.00';

/**
 * The per-line ceiling a fixture cart is built against, as the server's default sets it.
 */
const LINE_MAX = 10;

/**
 * The shipping a priced cart offers: two methods, one needing an address.
 */
const SHIPPING_OPTIONS: CartResponse['shipping']['options'] = [
    { id: 'standard', price: '5.00', requiresAddress: true, tracked: false },
    { id: 'pickup', price: '0.00', requiresAddress: false, tracked: false }
];

/**
 * A valid cart as `GET /cart` answers it, whose summary agrees with its lines.
 *
 * @param lines - `[productId, quantity]` pairs, in the order the cart lists them
 * @param selected - The shipping method the cart plans to ship by, or none; the request's own `null` (a clear) reads as none, as the server answers it
 * @param short - Ids of the lines that hold one more than can be bought, as after a sale
 * @returns A `CartResponse` that parses against the generated schema
 */
export const aCart = (
    lines: [string, number][],
    selected?: string | null,
    short: readonly string[] = []
): CartResponse => {
    const totalQuantity = lines.reduce((sum, [, quantity]) => sum + quantity, 0);
    const shippingCost = selected === 'standard' ? '5.00' : '0.00';
    const itemsTotal = multiplyDecimal(UNIT_PRICE, totalQuantity);
    return {
        items: lines.map(([productId, quantity]) => ({
            productId,
            quantity,
            availability: 'in_stock',
            ...(short.includes(productId) ? { quantityAvailable: quantity - 1 } : {}),
            canIncrease: quantity < LINE_MAX && !short.includes(productId)
        })),
        summary: {
            itemsCount: lines.length,
            totalQuantity,
            itemsTotal,
            shippingCost,
            totalPrice: sumDecimals([itemsTotal, shippingCost]),
            currency: 'EUR'
        },
        shipping: {
            required: lines.length > 0,
            ...(typeof selected === 'string' ? { selected } : {}),
            options: lines.length > 0 ? SHIPPING_OPTIONS : []
        },
        checkoutable: lines.length > 0 && short.length === 0
    };
};
