/**
 * Typed factories for the contract entities several specs need whole.
 *
 * Typed against the generated contract types, so a field the contract adds or makes required is a
 * compile error in every spec at once — rather than a hand-typed `{ id, totalPrice }` that only
 * fails when something finally parses it.
 */
import type { Order, Product, Return, User } from '@types';

/**
 * A valid, empty order — every required field the contract declares, all totals zero.
 *
 * @param overrides - the fields a case actually cares about
 * @returns an `Order` that parses against the generated schema
 */
export const anOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'o1',
    userId: 'u1',
    email: 'ada@example.com',
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalPrice: 0,
    netTotal: 0,
    taxTotal: 0,
    shippingNetAmount: 0,
    shippingTaxAmount: 0,
    taxSummary: [],
    status: 'pending',
    paymentStatus: 'unpaid',
    fulfillmentStatus: 'unfulfilled',
    returnStatus: 'none',
    ...overrides
});

/**
 * A valid account as `GET /account` and `GET /users/{id}` answer it — the three required fields,
 * plus whatever a case sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `User` that parses against the generated schema
 */
export const aUser = (overrides: Partial<User> = {}): User => ({
    id: '1',
    email: 'ada@example.com',
    username: 'ada',
    ...overrides
});

/**
 * A valid return as `GET /returns/{id}` answers it — one line, approved, nothing yet open to staff.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Return` that parses against the generated schema
 */
export const aReturn = (overrides: Partial<Return> = {}): Return => ({
    id: 'r1',
    orderId: 'o1',
    currency: 'EUR',
    status: 'approved',
    reason: 'withdrawal',
    lines: [{ productId: 'p1', quantity: 1, title: 'Shirt', unitPrice: 30 }],
    returnPostage: 'consumer',
    createdAt: '2026-09-01T10:00:00.000Z',
    actions: { approve: false, decline: false, receive: false },
    ...overrides
});

/**
 * A valid catalogue product — the required fields only, plus whatever a case sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Product` that parses against the generated schema
 */
export const aProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 'p1',
    title: 'Walnut desk',
    price: 120,
    currency: 'EUR',
    active: true,
    ...overrides
});
