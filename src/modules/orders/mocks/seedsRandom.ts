/**
 * The order history's random-profile generator. Loaded only when `VITE_MOCK_PROFILE=random` —
 * see `@mocks/mockRandom.ts` for the gate and the constraints.
 */
import type { Order, OrderItem, Product, User } from '@types';
import { ListOrdersResponse } from '@api/schemas';
import { faker } from '@mocks/mockRandom.ts';
import { getListOrdersResponseMock } from '@mocks/generated.ts';
import { assertMockContract } from '@mocks/mockValidation.ts';
import { computeOrderTotals } from '@mocks/mockOrderMath.ts';

/**
 * Lines are drawn from the catalogue the database was actually built with and owners from its
 * users, so every reference resolves — constraint 4 in `@mocks/mockRandom.ts`.
 */
export const buildRandomOrders = (products: Product[], users: User[]): Order[] => {
    const templates = getListOrdersResponseMock().data.items as Order[];
    const orders = templates.map((template, index) => {
        const lineCount = Math.max(1, Math.min(template.items.length, products.length));
        const items: OrderItem[] = faker.helpers
            .arrayElements(products, lineCount)
            .map((product) => ({
                product,
                quantity: faker.number.int({ min: 1, max: 10 })
            }));
        const owner = faker.helpers.arrayElement(users);
        // Deliberately not `createMockOrder` (mockOrderMath.ts): that helper stamps id/timestamps
        // from wall-clock time and Math.random(), which is correct for a freshly-placed seed or
        // checkout order but would make this profile unreproducible under a fixed
        // RANDOM_DATA_SEED — everything here must come from the seeded faker instance instead.
        const createdAt = faker.date.past().toISOString();
        return {
            id: faker.string.alphanumeric(20),
            userId: owner.id,
            email: owner.email,
            items,
            ...computeOrderTotals(items),
            status: template.status,
            notes: template.notes,
            createdAt,
            updatedAt: createdAt,
            // One guaranteed soft-deleted order, the same force-patch trick the product pool uses
            // for its `active: false` / `deletedAt` variants: `isOrderVisibleToCaller` has an
            // admin-only branch, and a profile that never produces a hidden order never reaches it.
            ...(index === 0 ? { deletedAt: faker.date.past().toISOString() } : {})
        };
    });

    assertMockContract(ListOrdersResponse, {
        success: true,
        status: 200,
        message: 'mock-profile:random',
        data: {
            items: orders,
            meta: { page: 1, pageSize: orders.length, totalItems: orders.length, totalPages: 1 }
        }
    });
    return orders;
};
