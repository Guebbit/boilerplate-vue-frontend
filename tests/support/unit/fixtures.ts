/**
 * Typed factories for the contract entities several specs need whole.
 *
 * Typed against the generated contract types, so a field the contract adds or makes required is a
 * compile error in every spec at once — rather than a hand-typed `{ id, totalPrice }` that only
 * fails when something finally parses it.
 */
import type { FulfillmentOrder, Order, Payment, Product, Return, Shipment, User } from '@types';

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
    currency: 'EUR',
    orderNumber: '2026-000001',
    ...overrides
});

/**
 * A valid payment as `GET /payments` answers it for staff — the required fields, plus whatever a
 * case sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Payment` that parses against the generated schema
 */
export const aPayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'pay-1',
    orderId: 'o1',
    amount: 50,
    currency: 'EUR',
    amountRefunded: 0,
    refunds: [],
    status: 'succeeded',
    displayStatus: 'succeeded',
    provider: 'fake',
    method: 'card',
    orderNumber: '2026-000001',
    email: 'ada@example.com',
    createdAt: '2026-03-04T10:00:00Z',
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
    orderNumber: '2026-000001',
    currency: 'EUR',
    status: 'approved',
    reason: 'withdrawal',
    kind: 'return',
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
    inStock: true,
    lowStock: false,
    active: true,
    ...overrides
});

/**
 * A valid fulfillment order as `GET /delivery/order/{id}` answers it — one physical line, open,
 * nothing shipped, and no action offered.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `FulfillmentOrder` that parses against the generated schema
 */
export const aFulfillmentOrder = (overrides: Partial<FulfillmentOrder> = {}): FulfillmentOrder => ({
    id: 'fo1',
    orderId: 'o1',
    number: 1,
    kind: 'physical',
    status: 'open',
    lines: [
        {
            productId: 'p1',
            title: 'Shirt',
            quantity: 2,
            shippedQuantity: 0,
            cancelledQuantity: 0,
            remaining: 2
        }
    ],
    actions: { ship: false, fulfill: false, hold: false, release: false, confirmWait: false },
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides
});

/**
 * A valid shipment as the delivery routes answer it — shipped, one line, no action offered.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Shipment` that parses against the generated schema
 */
export const aShipment = (overrides: Partial<Shipment> = {}): Shipment => ({
    id: 's1',
    orderId: 'o1',
    fulfillmentOrderId: 'fo1',
    number: 1,
    status: 'shipped',
    lines: [{ productId: 'p1', title: 'Shirt', quantity: 1 }],
    forced: false,
    shippedAt: '2026-09-02T10:00:00.000Z',
    actions: { deliver: false, editTracking: false },
    ...overrides
});
