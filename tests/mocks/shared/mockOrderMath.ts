/**
 * Pure, `mockDatabase`-free helpers shared by `mockShared.ts` (the fixed-seed profile, and every
 * handler that builds an order at runtime) and `mockProfiles.ts` (the random-data profile).
 *
 * Split out from `mockShared.ts` specifically so `mockProfiles.ts` can use them without creating
 * an import cycle: `mockShared.ts` imports `mockProfiles.ts` for `buildSeedDatabase()` /
 * `buildRandomDatabase()`, so `mockProfiles.ts` cannot import back from `mockShared.ts`. Nothing
 * here touches `mockDatabase` or session state, so this file has no reason to import from either.
 */
import type { Order } from '@types';

export const getIsoDateNow = () => new Date().toISOString();

/**
 * Mirrors the BE's `sumLineItems` (src/core/totals.ts): every order response carries
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
    values: Pick<Order, 'userId' | 'email' | 'items'> & Pick<Partial<Order>, 'status' | 'notes'>
): Order => ({
    id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: values.userId,
    email: values.email,
    items: values.items,
    ...computeOrderTotals(values.items),
    status: values.status ?? 'pending',
    notes: values.notes,
    createdAt: getIsoDateNow(),
    updatedAt: getIsoDateNow()
});
