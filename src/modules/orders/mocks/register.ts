/**
 * The order history's slice of the mock database.
 *
 * See `src/modules/products/mocks/register.ts` for why a module owns its own fixtures. Mirrors the
 * backend's `src/modules/orders/demo.ts`.
 *
 * ## Why this no longer needs the catalogue
 *
 * It used to be the deepest node in the fixture graph: an order embeds a full product snapshot, and
 * the old shared file gave it only a `productId`, so every line had to be resolved against
 * `soFar.sampleProducts` and the totals recomputed by `createMockOrder`. The published dataset
 * carries each order WHOLE — snapshots, `totalItems`, `totalQuantity` and `totalPrice`, all as the
 * backend's `applyOrderTransform` produced them — so there is nothing left to look up and nothing
 * left to recompute.
 *
 * That also removes the last place where this repo's arithmetic could quietly disagree with the
 * API's. `computeOrderTotals` still exists in `@mocks/mockOrderMath.ts`, and still has to: an order
 * a spec CREATES at runtime has no published row to read.
 *
 * `after: ['products']` stays in `../module.ts` regardless — the products slice must still be built
 * before the handlers run, and this module has no business changing that ordering on its own.
 */
import type { Order } from '@types';
import type { MockSeedData } from '@/kernel/registry';
import { buildSeedOrders } from '@mocks/mockDataset.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleOrders: Order[];
    }
}

export const buildOrdersMockSeeds = (): Promise<Partial<MockSeedData>> =>
    Promise.resolve({ sampleOrders: buildSeedOrders() });
