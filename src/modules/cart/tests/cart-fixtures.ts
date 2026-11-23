/**
 * Typed cart factory for the specs that interleave cart answers by hand, and the order factory
 * for what a checkout answers (`orders` and `wishlist` depend on the cart, so they reach it).
 *
 * A cart is built from its lines, so two carts in one test differ only by what the test changed,
 * and every total follows from the lines: a spec that asserts "this is the cart the server last
 * answered" compares whole carts, never a hand-copied number.
 */
import { GetOrderByIdResponse } from '@api/schemas';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import type { CartResponse, Order, OrderActions } from '@types';
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

/** Every `OrderActions` flag off: an order the caller may do nothing to. */
export const NO_ORDER_ACTIONS: OrderActions = {
    cancel: false,
    pay: false,
    recordPayment: false,
    process: false,
    overrideStatus: [],
    correctAddress: false,
    correctBilling: false,
    withdraw: false,
    delete: false,
    hardDelete: false,
    restore: false,
    invoice: false
};

/**
 * A valid, empty order — every required field the contract declares, all totals zero.
 *
 * @param overrides - the fields a case actually cares about
 * @returns an `Order` that parses against the generated schema
 */
export const anOrder = (overrides: Partial<Order> = {}): Order =>
    contractBody<Order>(GetOrderByIdResponse, {
        id: 'o1',
        userId: 'u1',
        email: 'ada@example.com',
        items: [],
        totalItems: 0,
        totalQuantity: 0,
        totalPrice: '0.00',
        netTotal: '0.00',
        taxTotal: '0.00',
        shippingNetAmount: '0.00',
        shippingTaxAmount: '0.00',
        taxSummary: [],
        status: 'pending',
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'unfulfilled',
        returnStatus: 'none',
        currency: 'EUR',
        orderNumber: '2026-000001',
        actions: NO_ORDER_ACTIONS,
        ...overrides
    });
