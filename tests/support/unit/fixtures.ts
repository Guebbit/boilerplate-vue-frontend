/**
 * Typed factories for the contract entities several specs need whole.
 *
 * Typed against the generated contract types, so a field the contract adds or makes required is a
 * compile error in every spec at once — rather than a hand-typed `{ id, totalPrice }` that only
 * fails when something finally parses it.
 */
import { STATUS_CODES } from 'node:http';
import type {
    Account,
    ErrorItem,
    FulfillmentOrder,
    InventoryLevel,
    Order,
    OrderActions,
    Payment,
    PreorderFulfillmentOrder,
    PreorderLevel,
    PreorderProductSummary,
    Problem,
    Product,
    Return,
    Shipment,
    Shop,
    Ticket,
    User,
    UserActions
} from '@types';

/** Every `OrderActions` flag off: an order the caller may do nothing to. */
export const NO_ORDER_ACTIONS: OrderActions = {
    cancel: false,
    pay: false,
    recordPayment: false,
    process: false,
    override: [],
    correctAddress: false,
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
    actions: NO_ORDER_ACTIONS,
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
    actions: { pay: false, sync: false, refund: false, settleByHand: [], cancelRefund: [] },
    ...overrides
});

/**
 * A valid account as `GET /account` answers it — the three required fields, plus whatever a case
 * sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns an `Account` that parses against the generated schema
 */
export const anAccount = (overrides: Partial<Account> = {}): Account => ({
    id: '1',
    email: 'ada@example.com',
    username: 'ada',
    ...overrides
});

/** Every `UserActions` flag `false`: a row the caller may do nothing to. */
export const NO_USER_ACTIONS: UserActions = {
    update: false,
    assignRole: false,
    delete: false,
    hardDelete: false,
    restore: false,
    setPurchaseHold: false,
    liftPurchaseHold: false,
    activate: false,
    deactivate: false
};

/** Every `UserActions` flag `true`: a row the caller may do anything to. */
export const ALL_USER_ACTIONS: UserActions = {
    update: true,
    assignRole: true,
    delete: true,
    hardDelete: true,
    restore: true,
    setPurchaseHold: true,
    liftPurchaseHold: true,
    activate: true,
    deactivate: true
};

/**
 * `UserActions` with every flag `false` but the ones a case names.
 *
 * @param allowed - the flags that are `true`
 * @returns a complete `UserActions`
 */
export const userActionsOf = (allowed: Partial<UserActions>): UserActions => ({
    ...NO_USER_ACTIONS,
    ...allowed
});

/**
 * A valid user as `GET /users/{id}` answers it — the required fields (`actions` included, all
 * `false`), plus whatever a case sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `User` that parses against the generated schema
 */
export const aUser = (overrides: Partial<User> = {}): User => ({
    id: '1',
    email: 'ada@example.com',
    username: 'ada',
    actions: NO_USER_ACTIONS,
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
    actions: { approve: false, decline: false, receive: false, close: false },
    ...overrides
});

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
        price: 120,
        currency: 'EUR',
        inStock: true,
        lowStock: false,
        active: true,
        ...overrides
    };
    // The server's rule, kept coarse: on sale and something to order (shelf or open backorder).
    return {
        buyable: product.purchasable !== false && (product.inStock || product.backorder === true),
        ...product
    };
};

/**
 * A valid stock-board row — some on the shelf, nothing backordered, preordering closed.
 *
 * @param overrides - the fields a case actually cares about
 * @returns an `InventoryLevel` that parses against the generated schema
 */
export const aLevel = (overrides: Partial<InventoryLevel> = {}): InventoryLevel => ({
    productId: 'p1',
    title: 'Walnut desk',
    onHand: 10,
    reserved: 2,
    available: 8,
    backorderLimit: 0,
    backordered: 0,
    ...overrides
});

/**
 * A valid preorder allowance row — a limit of ten, four outstanding (one unpaid, three paid).
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `PreorderLevel` that parses against the generated schema
 */
export const aPreorderLevel = (overrides: Partial<PreorderLevel> = {}): PreorderLevel => ({
    productId: 'p1',
    title: 'Walnut desk',
    releaseDate: '2027-03-15T12:00:00.000Z',
    backorderLimit: 10,
    backordered: 4,
    held: 1,
    paid: 3,
    left: 6,
    ordered: 7,
    ...overrides
});

/**
 * A valid per-product preorder summary — three paid units, all waiting for stock.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `PreorderProductSummary` that parses against the generated schema
 */
export const aPreorderSummary = (
    overrides: Partial<PreorderProductSummary> = {}
): PreorderProductSummary => ({
    productId: 'p1',
    title: 'Walnut desk',
    firstAgreedAt: '2027-03-15T12:00:00.000Z',
    paid: 3,
    waiting: 3,
    allocated: 0,
    shipped: 0,
    cancelled: 0,
    late: 0,
    ...overrides
});

/**
 * A valid row of the preorder board's second tab — one waiting fulfillment order of a paid order.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `PreorderFulfillmentOrder` that parses against the generated schema
 */
export const aPreorderFulfillmentOrder = (
    overrides: Partial<PreorderFulfillmentOrder> = {}
): PreorderFulfillmentOrder => ({
    id: 'fo1',
    orderId: 'o1',
    orderNumber: '2027-000001',
    number: 1,
    status: 'on_hold',
    state: 'waiting',
    lines: [
        {
            productId: 'p1',
            title: 'Walnut desk',
            quantity: 1,
            shippedQuantity: 0,
            cancelledQuantity: 0,
            remaining: 1
        }
    ],
    buyer: { userId: 'u1', email: 'buyer@example.com' },
    paidAt: '2026-10-01T10:00:00.000Z',
    agreedAt: '2027-03-15T12:00:00.000Z',
    slippedDays: 0,
    late: false,
    delivered: false,
    holdReason: 'awaiting_stock',
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides
});

/**
 * A valid fulfillment order as `GET /orders/{id}/fulfillment-orders` answers it — one physical line, open,
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
    actions: { ship: false, fulfill: false, hold: false, release: false },
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
    awaitingTracking: false,
    shippedAt: '2026-09-02T10:00:00.000Z',
    actions: { deliver: false, forceDeliver: false, update: false },
    ...overrides
});

/**
 * A valid shop as `GET /shop` answers it — an Italian seller trading in euros, shipping to Italy.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Shop` that parses against the generated schema
 */
export const aShop = (overrides: Partial<Shop> = {}): Shop => ({
    legalName: 'Guebbit Demo Shop Srl',
    street: 'Via Roma 1',
    city: 'Milano',
    zip: '20100',
    country: 'IT',
    email: 'shop@example.com',
    phone: '+39 02 1234567',
    currency: 'EUR',
    shipToCountries: ['IT'],
    returnAddress: { street: 'Via Roma 1', city: 'Milano', zip: '20100', country: 'IT' },
    returnPostagePayer: 'consumer',
    termsVersion: '1',
    backorderPromiseDays: 30,
    ...overrides
});

/** One error item as a spec writes it; `field` is the key `onResponseReject` lifts for the forms. */
type ProblemItem = ErrorItem & { field?: string };

/** The RFC 9110 names Node's `STATUS_CODES` still has under their older spelling. */
const CURRENT_TITLES: Record<number, string> = {
    413: 'Content Too Large',
    422: 'Unprocessable Content'
};

/**
 * The problem details an answered failure rejects with (RFC 9457), as the HTTP layer hands them to
 * a catch. One builder for every spec, typed on the generated `Problem`, so a member the contract
 * adds or requires is a compile error here and not a drift nobody sees.
 *
 * @param status - The HTTP status the server answered with.
 * @param errors - The `errors` items; the first one's message is the `detail` unless one is given.
 * @param detail - The summary sentence, when a spec needs one that differs from the first item's.
 * @returns The rejection value.
 */
export const aProblem = (
    status: number,
    errors: ProblemItem[],
    detail: string = errors[0]?.message ?? ''
): Problem => ({
    type: 'about:blank',
    title: CURRENT_TITLES[status] ?? STATUS_CODES[status] ?? 'Error',
    status,
    detail,
    errors
});

/**
 * A new, unassigned visitor ticket the way the API answers it; a case overrides what it needs.
 *
 * @param overrides - Fields to replace.
 * @returns A ticket that passes the response schema.
 */
export const aTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 't1',
    source: 'visitor',
    kind: 'contact',
    routeSet: 'TicketDisplay',
    notes: [],
    overdue: false,
    actions: {
        resolve: true,
        markSpam: true,
        reopen: false,
        assign: true,
        unassign: false,
        note: true,
        delete: true
    },
    email: 'curious@example.com',
    subject: 'A question',
    message: 'About the cats',
    status: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
});
