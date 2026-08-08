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
import type {
    AuditLogsResponseData,
    CartItem,
    ObservabilityHealth,
    ObservabilityMetricsSummary,
    Order,
    Product,
    User
} from '@types';
import { createMockOrder } from './mockOrderMath.ts';
import { seedUsers, seedProducts, seedOrders } from './seed-identities.ts';

export type MockProfile = 'seed' | 'random';

/**
 * What the three `/observability/*` endpoints answer with.
 *
 * This lives in the database rather than as frozen constants in `adminMockHandlers.ts` so the
 * random profile can reach it: `AdminOverviewTab.vue` is the most numeric and most
 * layout-fragile screen in the app, and `resilience.cy.ts` can only stress it with a 7-digit
 * request count, a zero-request cold start or a `loadAvg` of unexpected length if a profile can
 * supply them.
 *
 * Stored as the INNER payloads (`ObservabilityHealthResponse['data']` and friends), not the
 * envelopes: the handlers build the envelope, exactly as they do for every other family.
 */
export interface IMockObservability {
    health: ObservabilityHealth;
    metrics: ObservabilityMetricsSummary;
    audit: AuditLogsResponseData;
}

export interface IMockSeedData {
    sampleUsers: User[];
    sampleProducts: Product[];
    sampleCartItems: CartItem[];
    sampleOrders: Order[];
    observability: IMockObservability;
}

/**
 * Which profile is active. Reads `VITE_MOCK_PROFILE`; anything other than the literal
 * `'random'` — including unset — is the default, fixed-seed profile.
 */
export const resolveProfile = (): MockProfile =>
    import.meta.env.VITE_MOCK_PROFILE === 'random' ? 'random' : 'seed';

// ─── seed profile ───────────────────────────────────────────────────────────────
//
// The facts below — ids, emails, admin flags, titles, prices, who has what in their cart and
// their orders — are not written here. They come from `./seed-identities.ts`, which is
// byte-identical to `db/seeds/seed-identities.ts` in the BE, so the same login and the same records
// work against both MSW and the real API, and a `diff` between the two copies is the whole
// drift check. See that file's header for why it holds identities only and not whole fixtures.
//
// Before it existed the two datasets were restated by hand on each side and kept in step by a
// comment. That failed: the mock served all 5 products to everyone while the real API served 3 to
// non-admins, and the spec asserted the mock's number and went green.
//
// Each of these is a factory, not a plain array: handlers mutate items in place (splice, unshift,
// index-assignment), so a fresh call is needed on every reset, not a second reference to the
// same mutated objects.

const getIsoDateNow = () => new Date().toISOString();

/*
 * `imageUrl` is dropped rather than carried over from the shared identities, and that is not an
 * oversight. Those paths (`/images/seed/*.jpg`) are served by the BE out of its own `public/`;
 * this repo ships no such files, so under MSW they would resolve to 404s and every seeded avatar
 * and product image would render broken. `test:e2e:live` gets the real URLs from the real API,
 * which is the only mode where they mean anything.
 *
 * `active` is likewise not in the shared file: it is a BE model default (`true`), not a fact the
 * fixtures state, so restating it there would invent a field the seeder never writes.
 */
const createSeedUsers = (): User[] =>
    seedUsers.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        admin: user.admin,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }));

const createSeedProducts = (): Product[] =>
    seedProducts.map((product) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        active: product.active,
        imageUrl: undefined,
        ...(product.deletedAt ? { deletedAt: product.deletedAt } : {}),
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }));

/*
 * The fixed observability payloads the three `/observability/*` handlers serve under the seed
 * profile.
 */
const createSeedObservability = (): IMockObservability => ({
    health: {
        status: 'ok',
        environment: 'development',
        service: 'boilerplate-node-backend',
        nodeVersion: 'v20.0.0',
        uptimeSeconds: 3600,
        database: { status: 'connected' },
        integrations: { loki: true, otelEnabled: true, umami: true, faro: true },
        memory: { heapUsedMb: 64, heapTotalMb: 128, rssMb: 80 },
        system: { platform: 'linux', cpuCount: 4, loadAvg: [0.5, 0.4, 0.3] },
        timestamp: getIsoDateNow()
    },
    metrics: {
        http: {
            totalRequests: 1042,
            totalErrors: 12,
            errorRate: 0.0115,
            inFlight: 2,
            latencyMs: { p50: 18, p95: 85 }
        },
        auth: { loginSuccess: 58, loginFailure: 4, signupSuccess: 12 },
        business: { checkoutSuccess: 22, ordersCreated: 22 },
        database: { queriesTotal: 3120, errorsTotal: 0 },
        process: { uptimeSeconds: 3600, heapUsedMb: 64 },
        timestamp: getIsoDateNow()
    },
    audit: {
        total: 3,
        items: [
            {
                actor_user_id: 'user-admin-1',
                actor_role: 'admin',
                action: 'auth.login.succeeded',
                outcome: 'success',
                ip: '127.0.0.1',
                request_id: 'req-abc12345',
                trace_id: 'trace-def67890',
                timestamp: new Date(Date.now() - 60_000).toISOString(),
                level: 'info'
            },
            {
                actor_user_id: 'user-guest-1',
                actor_role: 'anonymous',
                action: 'auth.login.failed',
                outcome: 'failure',
                ip: '192.168.1.50',
                request_id: 'req-xyz99887',
                trace_id: 'trace-uvw33221',
                timestamp: new Date(Date.now() - 120_000).toISOString(),
                level: 'warn'
            },
            {
                actor_user_id: 'user-standard-2',
                actor_role: 'user',
                action: 'orders.create',
                outcome: 'success',
                ip: '10.0.0.5',
                request_id: 'req-lmn55443',
                trace_id: 'trace-opq11009',
                timestamp: new Date(Date.now() - 300_000).toISOString(),
                level: 'info'
            }
        ]
    }
});

export const buildSeedDatabase = (): IMockSeedData => {
    const sampleProducts = createSeedProducts();

    /*
     * The admin's cart, as the BE embeds it on the user document. Only the admin has one in the
     * fixtures; `mockDatabase.sampleCartItems` models a single active session's cart, so it takes
     * whichever seeded user actually has items rather than merging the two.
     */
    const sampleCartItems: CartItem[] = (
        seedUsers.find((user) => user.cart.length > 0)?.cart ?? []
    ).map((item) => ({ productId: item.productId, quantity: item.quantity }));

    /*
     * `createMockOrder` mints a fresh `order-<timestamp>-<rand>` id, which is right for orders a
     * spec creates at runtime and wrong for these: the BE seeds them with fixed `_id`s, so a spec
     * deep-linking to `/orders/:id` would hit a different URL under MSW than against the real API.
     * The id is put back afterwards, which is also why these two go through the factory at all —
     * it is what computes `totals` from the items.
     */
    const sampleOrders: Order[] = seedOrders.map((order) => ({
        ...createMockOrder({
            userId: order.userId,
            email: order.email,
            items: order.items.map((item) => ({
                product: sampleProducts.find((product) => product.id === item.productId)!,
                quantity: item.quantity
            })),
            status: 'pending'
        }),
        id: order.id
    }));

    return {
        sampleUsers: createSeedUsers(),
        sampleProducts,
        sampleCartItems,
        sampleOrders,
        observability: createSeedObservability()
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
