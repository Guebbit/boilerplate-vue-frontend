/**
 * Pure, `mockDatabase`-free helpers shared by `mockShared.ts` (every handler that builds an order
 * at runtime) and the modules' own fixture builders in `src/modules/<name>/mocks/seeds.ts`.
 *
 * Split out from `mockShared.ts` so a module's seed builder can use them without importing the
 * shared store: those builders run BEFORE `mockDatabase` is populated, so anything they touch must
 * not depend on its contents. Nothing here reads `mockDatabase` or session state, which is what
 * makes it safe from either side.
 */
import type { Order } from '@types';

export const getIsoDateNow = () => new Date().toISOString();

/**
 * Mirrors the BE's `sumLineItems` (src/infrastructure/totals.ts): every order response carries
 * `totalItems` (line-item count), `totalQuantity` (sum of quantities) and `totalPrice`
 * (sum of price x quantity, rounded to cents). There is no single `total` field — the API
 * stopped collapsing these three into one, and openapi.yaml requires all three.
 *
 * The parameter is structural rather than `OrderItem[]` so cart lines, whose product is looked
 * up and may be missing, can be priced by the same function — the BE shares one helper between
 * its order and cart totals for exactly that reason.
 */
export const computeOrderTotals = (
    items: readonly { quantity: number; product?: { price?: number } }[]
) => {
    let totalQuantity = 0;
    let totalPrice = 0;
    for (const item of items) {
        totalQuantity += item.quantity;
        totalPrice += (item.product?.price ?? 0) * item.quantity;
    }
    return {
        totalItems: items.length,
        totalQuantity,
        totalPrice: Math.round(totalPrice * 100) / 100
    };
};

/**
 * Build an order the way the BE does: caller-supplied identity and lines, totals derived.
 *
 * Used for the seed fixtures, the random-profile fixtures, and orders created at runtime by the
 * checkout handler, so a seeded order, a randomly-generated one and a freshly placed one can
 * never disagree about their shape.
 */
export const createMockOrder = (
    values: Pick<Order, 'userId' | 'email' | 'items'> &
        Pick<Partial<Order>, 'status' | 'notes' | 'shippingMethod' | 'shippingCost'>
): Order => {
    const totals = computeOrderTotals(values.items);
    return {
        id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: values.userId,
        email: values.email,
        items: values.items,
        ...totals,
        // The BE's rule exactly: what the customer owes is the lines plus the frozen shipping.
        totalPrice: Math.round((totals.totalPrice + (values.shippingCost ?? 0)) * 100) / 100,
        status: values.status ?? 'pending',
        notes: values.notes,
        ...(values.shippingMethod === undefined
            ? {}
            : { shippingMethod: values.shippingMethod, shippingCost: values.shippingCost }),
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    };
};
