/**
 * The two ways `mockShared.ts` can populate `mockDatabase`, selected by `VITE_MOCK_PROFILE`.
 *
 * - `buildSeedDatabase()` — today's fixed fixtures, mirroring the BE's `db/seeds/index.ts`.
 *   Unchanged behaviour; this is `createInitialMockDatabase()`'s old body, moved verbatim.
 *   Synchronous and dependency-light on purpose: this is the default profile every existing
 *   spec runs under, so it must never pay for anything the random profile needs.
 * - `buildRandomDatabase()` — faker-seeded, contract-valid data. The actual implementation lives
 *   in `mockProfilesRandom.ts`, reached only through the dynamic `import()` below, gated on
 *   `resolveProfile() === 'random'`. See that file's docstring for why the split exists — in
 *   short, it and its two heavy dependencies (`@faker-js/faker`, `tests/mocks/generated.ts`)
 *   must never end up in the seed profile's module graph.
 */
import type { CartItem, Order, Product, User } from '@types';
import { createMockOrder } from './mockOrderMath.ts';

export type MockProfile = 'seed' | 'random';

export interface IMockSeedData {
    sampleUsers: User[];
    sampleProducts: Product[];
    sampleCartItems: CartItem[];
    sampleOrders: Order[];
}

/**
 * Which profile is active. Reads `VITE_MOCK_PROFILE`; anything other than the literal
 * `'random'` — including unset — is the default, fixed-seed profile.
 */
export const resolveProfile = (): MockProfile =>
    import.meta.env.VITE_MOCK_PROFILE === 'random' ? 'random' : 'seed';

// ─── seed profile ───────────────────────────────────────────────────────────────
//
// IDs, credentials and content below mirror db/seeds/index.ts in the BE (PROPOSAL §6-A), so the
// same login and the same records work against both MSW and the real API.
//
// Each of these is a factory, not a plain array: handlers mutate items in place (splice, unshift,
// index-assignment), so a fresh call is needed on every reset, not a second reference to the
// same mutated objects.

const getIsoDateNow = () => new Date().toISOString();

const createSeedUsers = (): User[] => [
    {
        id: '65dd2bdb923652b7800fe180',
        email: 'root@root.it',
        username: 'root',
        admin: true,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65de646a44f861fd83c13f13',
        email: 'gino@pino.it',
        username: 'ginopinoshow',
        admin: false,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }
];

const createSeedProducts = (): Product[] => [
    {
        id: '65dc8a99604c307b702b5ccc',
        title: 'Sallyno Panino',
        description: 'Piccolo Sallyno panino. Da mangiare di coccole',
        price: 100,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65dc8ad8604c307b702b5cd4',
        title: 'Sallyno Carino',
        description: 'Sallyno incredibilmente carino. Illegale in 400 paesi. Soft deleted product.',
        price: 50,
        active: true,
        imageUrl: undefined,
        deletedAt: '2024-02-26T23:34:44.832Z',
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65dc9be92f2794d1c16741e1',
        title: 'Miciona inutile',
        description: 'Miciona inutile, piccolo catorcio che come lavoro produce pelo a non finire',
        price: 1,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65dcdec2b18ad5e4bd597f0f',
        title: 'Micino pufettino',
        description: 'Micino pufettino, incredibilmente pufino. Illegale in 400 paesi.',
        price: 77,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '6622c88a5123b1e286f440f8',
        title: 'Bundle micini',
        description: 'Produttori di rumori molesti a tutte le ore. Inactive product.',
        price: 40,
        active: false,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }
];

export const buildSeedDatabase = (): IMockSeedData => {
    const sampleProducts = createSeedProducts();

    // Mirrors the admin's embedded `cart.items` in the seed: 2x Sallyno Panino, 3x Micino pufettino.
    const sampleCartItems: CartItem[] = [
        { productId: '65dc8a99604c307b702b5ccc', quantity: 2 },
        { productId: '65dcdec2b18ad5e4bd597f0f', quantity: 3 }
    ];

    // Mirrors the two seeded orders (db/seeds/index.ts), both placed by root.
    const sampleOrders: Order[] = [
        createMockOrder({
            userId: '65dd2bdb923652b7800fe180',
            email: 'oldpsw@root.it',
            items: [
                { product: sampleProducts[0], quantity: 1 },
                { product: sampleProducts[2], quantity: 10 }
            ],
            status: 'pending'
        }),
        createMockOrder({
            userId: '65dd2bdb923652b7800fe180',
            email: 'root@root.it',
            items: [{ product: sampleProducts[3], quantity: 20 }],
            status: 'pending'
        })
    ];

    return {
        sampleUsers: createSeedUsers(),
        sampleProducts,
        sampleCartItems,
        sampleOrders
    };
};

// ─── random profile ─────────────────────────────────────────────────────────────
//
// Both functions below dynamically import mockProfilesRandom.ts on every call rather than
// caching the module reference — dynamic import of an already-loaded specifier resolves to the
// same cached module instance and is effectively free, so there is no benefit to hand-rolling a
// cache, only a way to get it wrong.

/**
 * Builds a faker-seeded, contract-valid database. See `mockProfilesRandom.ts` for the
 * implementation and the design constraints it has to satisfy.
 */
export const buildRandomDatabase = (): Promise<IMockSeedData> =>
    import('./mockProfilesRandom.ts').then((random) => random.buildRandomDatabase());

/**
 * The RNG seed backing the random profile — see `mockProfilesRandom.ts`'s `resolveMockSeed()`
 * for how it's resolved and why it's memoised. Exposed here so callers that only need the seed
 * for logging (`apiMock.ts`) don't need to know the random profile is a separate module.
 */
export const resolveMockSeed = (): Promise<number> =>
    import('./mockProfilesRandom.ts').then((random) => random.resolveMockSeed());
