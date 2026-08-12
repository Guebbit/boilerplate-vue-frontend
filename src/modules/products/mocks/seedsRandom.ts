/**
 * The catalogue's random-profile generator. Loaded only when `VITE_MOCK_PROFILE=random`, through
 * the dynamic import in `./seeds.ts` — see `@mocks/mockRandom.ts` for why that gate matters and
 * for the constraints every generator here satisfies.
 */
import type { Product } from '@types';
import { ListProductsResponse } from '@api/schemas';
import { faker } from '@mocks/mockRandom.ts';
import { getListProductsResponseMock } from '@mocks/generated.ts';
import { assertMockContract } from '@mocks/mockValidation.ts';

// Minimum product pool size: one each of the four force-patched variants below, plus at least
// one plain random product left untouched.
const MIN_RANDOM_PRODUCTS = 5;

/** Generates at least `minCount` random product envelopes' worth of `.data.items`, envelope discarded. */
const generateProductPool = (minCount: number): Product[] => {
    const pool: Product[] = [];
    while (pool.length < minCount) {
        pool.push(...(getListProductsResponseMock().data.items as Product[]));
    }
    return pool;
};

// Force-patch helpers for the four guaranteed product variants (constraints 4 and 5 in mockRandom.ts).
const withActiveFalse = (product: Product): Product => ({
    ...product,
    active: false,
    deletedAt: undefined
});
const withDeletedAt = (product: Product): Product => ({
    ...product,
    active: true,
    deletedAt: faker.date.past().toISOString()
});
const withEveryOptionalField = (product: Product): Product => ({
    ...product,
    description: product.description ?? faker.commerce.productDescription(),
    active: true,
    imageUrl: product.imageUrl ?? faker.internet.url(),
    categories: product.categories?.length ? product.categories : [faker.commerce.department()],
    tags: product.tags?.length ? product.tags : [faker.word.sample()],
    createdAt: product.createdAt ?? faker.date.past().toISOString(),
    updatedAt: product.updatedAt ?? faker.date.recent().toISOString(),
    deletedAt: undefined
});
const withNoOptionalFields = (product: Product): Product => ({
    id: product.id,
    title: product.title,
    price: product.price
});

export const buildRandomProducts = (): Product[] => {
    const pool = generateProductPool(MIN_RANDOM_PRODUCTS);
    const patched = pool.map((product, index) => {
        if (index === 0) return withActiveFalse(product);
        if (index === 1) return withDeletedAt(product);
        if (index === 2) return withEveryOptionalField(product);
        if (index === 3) return withNoOptionalFields(product);
        return product;
    });
    // The generator is itself a thing that can drift — validate the reassembled envelope
    // against the same schema a real ListProducts response has to satisfy.
    assertMockContract(ListProductsResponse, {
        success: true,
        status: 200,
        message: 'mock-profile:random',
        data: {
            items: patched,
            meta: { page: 1, pageSize: patched.length, totalItems: patched.length, totalPages: 1 }
        }
    });
    return patched;
};
