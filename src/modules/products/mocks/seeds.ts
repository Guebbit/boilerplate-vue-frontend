/**
 * The catalogue's slice of the mock database.
 *
 * Declared here rather than in a shared fixture file so that `rm -rf src/modules/products` takes
 * the demo catalogue with it. The `declare module` block below is what makes that safe: it adds
 * `sampleProducts` to `MockSeedData`, so deleting this folder removes the field from the type and
 * every leftover `mockDatabase.sampleProducts` becomes a compile error instead of a read that
 * silently returns `undefined`.
 *
 * Mirrors the backend's `src/modules/products/seeds.ts`, which contributes the same records to
 * `db/seeds/index.ts` through the same manifest field.
 */
import type { Product } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { seedProducts } from '@mocks/seed-identities.ts';
import { getIsoDateNow } from '@mocks/mockOrderMath.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleProducts: Product[];
    }
}

/*
 * The facts — ids, titles, prices, which product is inactive and which is soft-deleted — are not
 * written here. They come from `@mocks/seed-identities.ts`, which is byte-identical to
 * `db/seeds/seed-identities.ts` in the BE, so the same records answer against both MSW and the
 * real API and a `diff` between the two copies is the whole drift check.
 *
 * A factory, not a plain array: handlers mutate items in place (splice, unshift,
 * index-assignment), so a fresh call is needed on every reset, not a second reference to the same
 * mutated objects.
 *
 * `imageUrl` is dropped rather than carried over from the shared identities, and that is not an
 * oversight. Those paths (`/images/seed/*.jpg`) are served by the BE out of its own `public/`;
 * this repo ships no such files, so under MSW they would resolve to 404s and every seeded product
 * image would render broken. `test:e2e:live` gets the real URLs from the real API, which is the
 * only mode where they mean anything.
 */
const createSeedProducts = (): Product[] =>
    seedProducts.map((product) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        stock: product.stock,
        categories: product.categories,
        tags: product.tags,
        active: product.active,
        imageUrl: undefined,
        ...(product.deletedAt ? { deletedAt: product.deletedAt } : {}),
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }));

/**
 * Nothing else in the database derives from the catalogue's own inputs, so this builder ignores
 * `soFar` — it is the root of the fixture graph, and `cart` and `orders` name it in their `after`.
 *
 * The random branch is reached through a dynamic import so that `@faker-js/faker` and
 * `@mocks/generated.ts` stay out of the seed profile's module graph; see `@mocks/mockRandom.ts`.
 */
export const buildProductsMockSeeds = async ({
    profile
}: MockSeedContext): Promise<Partial<MockSeedData>> =>
    profile === 'random'
        ? import('./seedsRandom.ts').then((random) => ({
              sampleProducts: random.buildRandomProducts()
          }))
        : { sampleProducts: createSeedProducts() };
