/**
 * The order history's slice of the mock database.
 *
 * See `src/modules/products/mocks/seeds.ts` for why a module owns its own fixtures. Mirrors the
 * backend's `src/modules/orders/seeds.ts`.
 *
 * The deepest node in the fixture graph: an order embeds a full product snapshot, so it cannot be
 * built until the catalogue exists. That is what `mockSeeds.after` in `../module.ts` declares and
 * what `soFar` below delivers — note that no line here imports the products module, only its data.
 */
import type { Order, Product } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { seedOrders } from '@mocks/seed-identities.ts';
import { createMockOrder } from '@mocks/mockOrderMath.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleOrders: Order[];
    }
}

/*
 * `createMockOrder` mints a fresh `order-<timestamp>-<rand>` id, which is right for orders a
 * spec creates at runtime and wrong for these: the BE seeds them with fixed `_id`s, so a spec
 * deep-linking to `/orders/:id` would hit a different URL under MSW than against the real API.
 * The id is put back afterwards, which is also why these go through the factory at all — it is
 * what computes `totals` from the items.
 */
const createSeedOrders = (products: Product[]): Order[] =>
    seedOrders.map((order) => ({
        ...createMockOrder({
            userId: order.userId,
            email: order.email,
            items: order.items.map((item) => ({
                product: products.find((product) => product.id === item.productId)!,
                quantity: item.quantity
            })),
            status: 'pending'
        }),
        id: order.id,
        // Spread conditionally, like the product fixtures: an explicit `deletedAt: undefined` key
        // is still a key, and `isOrderVisibleToCaller` tests for the field's absence.
        ...(order.deletedAt ? { deletedAt: order.deletedAt } : {})
    }));

/**
 * With no catalogue in the database — the products module deleted — there is nothing for an order
 * line to reference, so this contributes an empty history rather than orders whose `productId`s
 * resolve to nothing. Both profiles degrade the same way, and `cartItemToOrderItem`'s
 * non-null-asserted lookup in `mockShared.ts` never sees a dangling id.
 */
export const buildOrdersMockSeeds = async ({
    profile,
    soFar
}: MockSeedContext): Promise<Partial<MockSeedData>> => {
    const products = soFar.sampleProducts ?? [];
    if (products.length === 0) return { sampleOrders: [] };

    return profile === 'random'
        ? import('./seedsRandom.ts').then((random) => ({
              sampleOrders: random.buildRandomOrders(products, soFar.sampleUsers ?? [])
          }))
        : { sampleOrders: createSeedOrders(products) };
};
