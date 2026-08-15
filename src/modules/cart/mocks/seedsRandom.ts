/**
 * The cart's random-profile generator. Loaded only when `VITE_MOCK_PROFILE=random` — see
 * `@mocks/mockRandom.ts` for the gate and the constraints.
 */
import type { CartItem, Product } from '@types';
import { faker } from '@mocks/mockRandom.ts';

/**
 * Picks up to three products from the catalogue the database was actually built with, so every
 * `productId` resolves — `cartItemToOrderItem` in `mockShared.ts` throws on an id it cannot find,
 * which is the canary for this relinking being wrong.
 */
export const buildRandomCartItems = (products: Product[]): CartItem[] => {
    const pickCount = Math.min(products.length, faker.number.int({ min: 1, max: 3 }));
    return faker.helpers.arrayElements(products, pickCount).map((product) => ({
        productId: product.id,
        quantity: faker.number.int({ min: 1, max: 5 })
    }));
};
