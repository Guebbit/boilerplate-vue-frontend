/**
 * `mockProfiles.ts`'s two database builders, isolated from the Cypress layer.
 *
 * `resetModules()` + a fresh dynamic `import()` per case: `resolveMockSeed()` memoises its
 * result at module scope (inside `mockProfilesRandom.ts`, reached through a dynamic import),
 * so reproducibility/variance checks need a genuinely fresh module instance per seed, not just
 * a re-stubbed env var read by an already-memoised function.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const loadMockProfiles = async () => {
    vi.resetModules();
    return import('../../mocks/shared/mockProfiles.ts');
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Blanks out ISO date strings so a comparison isn't defeated by wall-clock jitter — see the
 * reproducibility test below for why exact timestamps aren't part of what VITE_MOCK_SEED promises. */
const normalizeVolatileDates = (value: unknown): unknown =>
    JSON.parse(
        JSON.stringify(value, (_key, entry) =>
            typeof entry === 'string' && ISO_DATE_PATTERN.test(entry) ? '<date>' : entry
        )
    ) as unknown;

afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
});

describe('resolveProfile', () => {
    it('defaults to "seed" when VITE_MOCK_PROFILE is unset', async () => {
        const { resolveProfile } = await loadMockProfiles();
        expect(resolveProfile()).toBe('seed');
    });

    it('returns "random" when VITE_MOCK_PROFILE=random', async () => {
        vi.stubEnv('VITE_MOCK_PROFILE', 'random');
        const { resolveProfile } = await loadMockProfiles();
        expect(resolveProfile()).toBe('random');
    });

    it('falls back to "seed" for any other value', async () => {
        vi.stubEnv('VITE_MOCK_PROFILE', 'garbage');
        const { resolveProfile } = await loadMockProfiles();
        expect(resolveProfile()).toBe('seed');
    });
});

describe('buildSeedDatabase', () => {
    it('returns the fixed seed identities and counts, unchanged by the mockProfiles.ts move', async () => {
        const { buildSeedDatabase } = await loadMockProfiles();
        const database = buildSeedDatabase();

        expect(database.sampleUsers.map((user) => user.id)).toEqual([
            '65dd2bdb923652b7800fe180',
            '65de646a44f861fd83c13f13'
        ]);
        expect(database.sampleProducts).toHaveLength(5);
        expect(database.sampleCartItems).toHaveLength(2);
        expect(database.sampleOrders).toHaveLength(2);
    });
});

describe('buildRandomDatabase', () => {
    it('keeps the two seed users’ identity fixed, randomising only cosmetic fields', async () => {
        const { buildRandomDatabase } = await loadMockProfiles();
        const database = await buildRandomDatabase();

        expect(database.sampleUsers).toEqual([
            expect.objectContaining({
                id: '65dd2bdb923652b7800fe180',
                email: 'root@root.it',
                admin: true,
                active: true
            }),
            expect.objectContaining({
                id: '65de646a44f861fd83c13f13',
                email: 'gino@pino.it',
                admin: false,
                active: true
            })
        ]);
    });

    it('guarantees at least one inactive product and one soft-deleted product', async () => {
        const { buildRandomDatabase } = await loadMockProfiles();
        const { sampleProducts } = await buildRandomDatabase();

        expect(sampleProducts.some((product) => product.active === false)).toBe(true);
        expect(sampleProducts.some((product) => Boolean(product.deletedAt))).toBe(true);
    });

    it('guarantees at least one fully populated product and one with every optional field absent', async () => {
        const { buildRandomDatabase } = await loadMockProfiles();
        const { sampleProducts } = await buildRandomDatabase();

        expect(
            sampleProducts.some(
                (product) =>
                    product.description &&
                    product.imageUrl &&
                    product.categories?.length &&
                    product.tags?.length &&
                    product.createdAt &&
                    product.updatedAt
            )
        ).toBe(true);
        expect(
            sampleProducts.some(
                (product) =>
                    !product.description &&
                    !product.imageUrl &&
                    !product.categories &&
                    !product.tags &&
                    !product.createdAt &&
                    !product.updatedAt &&
                    !product.deletedAt
            )
        ).toBe(true);
    });

    it('keeps cart items and order line items pointing at products that actually exist', async () => {
        const { buildRandomDatabase } = await loadMockProfiles();
        const { sampleProducts, sampleCartItems, sampleOrders } = await buildRandomDatabase();
        const productIds = new Set(sampleProducts.map((product) => product.id));

        for (const item of sampleCartItems) expect(productIds.has(item.productId)).toBe(true);
        for (const order of sampleOrders)
            for (const line of order.items) expect(productIds.has(line.product.id)).toBe(true);
    });

    it('produces contract-valid orders with correctly derived totals', async () => {
        const { buildRandomDatabase } = await loadMockProfiles();
        const { sampleOrders } = await buildRandomDatabase();

        for (const order of sampleOrders) {
            const expectedQuantity = order.items.reduce((sum, line) => sum + line.quantity, 0);
            const expectedPrice =
                Math.round(
                    order.items.reduce((sum, line) => sum + line.product.price * line.quantity, 0) *
                        100
                ) / 100;
            expect(order.totalItems).toBe(order.items.length);
            expect(order.totalQuantity).toBe(expectedQuantity);
            expect(order.totalPrice).toBe(expectedPrice);
        }
    });

    it('is reproducible for a given VITE_MOCK_SEED', async () => {
        vi.stubEnv('VITE_MOCK_SEED', '42');
        const firstModule = await loadMockProfiles();
        const first = await firstModule.buildRandomDatabase();
        vi.stubEnv('VITE_MOCK_SEED', '42');
        const secondModule = await loadMockProfiles();
        const second = await secondModule.buildRandomDatabase();

        // Normalised: faker's default `refDate` for `date.past()`/`date.recent()` is real
        // wall-clock time, so two sequential calls a few milliseconds apart never produce
        // byte-identical timestamps even under the same seed. What VITE_MOCK_SEED actually
        // promises to reproduce is the STRUCTURE a bug report would need — which product is
        // inactive, which is fully empty, which ids a cart/order references, the quantities and
        // totals — not the exact millisecond a date field landed on.
        expect(normalizeVolatileDates(second)).toEqual(normalizeVolatileDates(first));
    });

    it('produces a different dataset for a different VITE_MOCK_SEED', async () => {
        vi.stubEnv('VITE_MOCK_SEED', '1');
        const firstModule = await loadMockProfiles();
        const first = await firstModule.buildRandomDatabase();
        vi.stubEnv('VITE_MOCK_SEED', '2');
        const secondModule = await loadMockProfiles();
        const second = await secondModule.buildRandomDatabase();

        // Normalised for the same reason as the reproducibility test above — otherwise this
        // would trivially pass even if the seed were silently ignored, since two sequential
        // calls' wall-clock-anchored dates always differ regardless of VITE_MOCK_SEED.
        expect(normalizeVolatileDates(second)).not.toEqual(normalizeVolatileDates(first));
    });
});

describe('resolveMockSeed', () => {
    it('memoises the resolved seed within one module instance', async () => {
        vi.stubEnv('VITE_MOCK_SEED', '7');
        const { resolveMockSeed } = await loadMockProfiles();

        expect(await resolveMockSeed()).toBe(7);
        expect(await resolveMockSeed()).toBe(7);
    });

    it('generates a fresh numeric seed when VITE_MOCK_SEED is unset', async () => {
        const { resolveMockSeed } = await loadMockProfiles();

        expect(Number.isFinite(await resolveMockSeed())).toBe(true);
    });

    it('persists the generated seed to sessionStorage, surviving a fresh module instance (a page reload)', async () => {
        const firstModule = await loadMockProfiles();
        const first = await firstModule.resolveMockSeed();
        // Simulates what cy.visit() does: a full page reload re-evaluates the module (fresh
        // instance, module-level memoisation gone) but the same browser tab's sessionStorage
        // survives — without that bridge this would draw a brand new random seed instead.
        const secondModule = await loadMockProfiles();
        const second = await secondModule.resolveMockSeed();

        expect(second).toBe(first);
    });

    it('draws a fresh seed once sessionStorage is cleared (a new browser tab / test)', async () => {
        const firstModule = await loadMockProfiles();
        const first = await firstModule.resolveMockSeed();
        sessionStorage.clear();
        const secondModule = await loadMockProfiles();
        const second = await secondModule.resolveMockSeed();

        expect(second).not.toBe(first);
    });

    it('prefers an explicit VITE_MOCK_SEED over whatever sessionStorage holds', async () => {
        const firstModule = await loadMockProfiles();
        await firstModule.resolveMockSeed(); // persists a fresh seed to sessionStorage
        vi.stubEnv('VITE_MOCK_SEED', '999');
        const { resolveMockSeed } = await loadMockProfiles();

        expect(await resolveMockSeed()).toBe(999);
    });
});
