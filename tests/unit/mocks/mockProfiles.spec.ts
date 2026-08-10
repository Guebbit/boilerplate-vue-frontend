/**
 * `mockProfiles.ts`'s two database builders, isolated from the Cypress layer.
 *
 * `resetModules()` + a fresh dynamic `import()` per case: `resolveMockSeed()` memoises its
 * result at module scope (inside `mockProfilesRandom.ts`, reached through a dynamic import),
 * so reproducibility/variance checks need a genuinely fresh module instance per seed, not just
 * a re-stubbed env var read by an already-memoised function.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const loadMockProfiles = () => {
    vi.resetModules();
    return import('../../mocks/shared/mockProfiles.ts');
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Blanks out ISO date strings so a comparison isn't defeated by wall-clock jitter — see the
 * reproducibility test below for why exact timestamps aren't part of what RANDOM_DATA_SEED promises. */
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
    it('defaults to "seed" when VITE_MOCK_PROFILE is unset', () =>
        loadMockProfiles().then(({ resolveProfile }) => {
            expect(resolveProfile()).toBe('seed');
        }));

    it('returns "random" when VITE_MOCK_PROFILE=random', () => {
        vi.stubEnv('VITE_MOCK_PROFILE', 'random');

        return loadMockProfiles().then(({ resolveProfile }) => {
            expect(resolveProfile()).toBe('random');
        });
    });

    it('falls back to "seed" for any other value', () => {
        vi.stubEnv('VITE_MOCK_PROFILE', 'garbage');

        return loadMockProfiles().then(({ resolveProfile }) => {
            expect(resolveProfile()).toBe('seed');
        });
    });
});

describe('buildSeedDatabase', () => {
    it('returns the fixed seed identities and counts', () => {
        return loadMockProfiles().then(({ buildSeedDatabase }) => {
            const database = buildSeedDatabase();
            expect(database.sampleUsers.map((user) => user.id)).toEqual([
                '65dd2bdb923652b7800fe180',
                '65de646a44f861fd83c13f13'
            ]);
            expect(database.sampleProducts).toHaveLength(5);
            expect(database.sampleCartItems).toHaveLength(2);
            expect(database.sampleOrders).toHaveLength(3);
        });
    });

    it('carries the soft-deleted order fixture through the factory', () => {
        // `createMockOrder` rebuilds each order to compute its totals, so a field the mapper
        // forgets to spread back is silently dropped — which would leave every visibility
        // branch in `isOrderVisibleToCaller` untested while the suite stayed green.
        return loadMockProfiles().then(({ buildSeedDatabase }) => {
            const softDeleted = buildSeedDatabase().sampleOrders.filter((order) => order.deletedAt);

            expect(softDeleted).toHaveLength(1);
            expect(softDeleted[0].id).toBe('66b3f0c14d2e8a91c7d4a015');
        });
    });
});

describe('buildRandomDatabase', () => {
    it('keeps the two seed users’ identity fixed, randomising only cosmetic fields', () => {
        return loadMockProfiles()
            .then(({ buildRandomDatabase }) => {
                return buildRandomDatabase();
            })
            .then((database) => {
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
    });

    it('guarantees at least one inactive product and one soft-deleted product', () => {
        return loadMockProfiles()
            .then(({ buildRandomDatabase }) => {
                return buildRandomDatabase();
            })
            .then(({ sampleProducts }) => {
                expect(sampleProducts.some((product) => product.active === false)).toBe(true);
                expect(sampleProducts.some((product) => Boolean(product.deletedAt))).toBe(true);
            });
    });

    it('guarantees at least one fully populated product and one with every optional field absent', () => {
        return loadMockProfiles()
            .then(({ buildRandomDatabase }) => {
                return buildRandomDatabase();
            })
            .then(({ sampleProducts }) => {
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
    });

    it('keeps cart items and order line items pointing at products that actually exist', () => {
        return loadMockProfiles()
            .then(({ buildRandomDatabase }) => {
                return buildRandomDatabase();
            })
            .then(({ sampleProducts, sampleCartItems, sampleOrders }) => {
                const productIds = new Set(sampleProducts.map((product) => product.id));
                for (const item of sampleCartItems)
                    expect(productIds.has(item.productId)).toBe(true);
                for (const order of sampleOrders)
                    for (const line of order.items)
                        expect(productIds.has(line.product.id)).toBe(true);
            });
    });

    it('produces contract-valid orders with correctly derived totals', () => {
        return loadMockProfiles()
            .then(({ buildRandomDatabase }) => {
                return buildRandomDatabase();
            })
            .then(({ sampleOrders }) => {
                for (const order of sampleOrders) {
                    const expectedQuantity = order.items.reduce(
                        (sum, line) => sum + line.quantity,
                        0
                    );
                    const expectedPrice =
                        Math.round(
                            order.items.reduce(
                                (sum, line) => sum + line.product.price * line.quantity,
                                0
                            ) * 100
                        ) / 100;
                    expect(order.totalItems).toBe(order.items.length);
                    expect(order.totalQuantity).toBe(expectedQuantity);
                    expect(order.totalPrice).toBe(expectedPrice);
                }
            });
    });

    it('is reproducible for a given RANDOM_DATA_SEED', () => {
        vi.stubEnv('RANDOM_DATA_SEED', '42');
        // Nested rather than flat: the last step compares against `first`, which a flat chain
        // would have let fall out of scope.
        return loadMockProfiles()
            .then((firstModule) => firstModule.buildRandomDatabase())
            .then((first) => {
                vi.stubEnv('RANDOM_DATA_SEED', '42');
                return loadMockProfiles()
                    .then((secondModule) => secondModule.buildRandomDatabase())
                    .then((second) => [first, second] as const);
            })
            .then(([first, second]) => {
                // Normalised: faker's default `refDate` for `date.past()`/`date.recent()` is real
                // wall-clock time, so two sequential calls a few milliseconds apart never produce
                // byte-identical timestamps even under the same seed. What RANDOM_DATA_SEED actually
                // promises to reproduce is the STRUCTURE a bug report would need — which product is
                // inactive, which is fully empty, which ids a cart/order references, the quantities and
                // totals — not the exact millisecond a date field landed on.
                expect(normalizeVolatileDates(second)).toEqual(normalizeVolatileDates(first));
            });
    });

    it('produces a different dataset for a different RANDOM_DATA_SEED', () => {
        vi.stubEnv('RANDOM_DATA_SEED', '1');
        return loadMockProfiles()
            .then((firstModule) => firstModule.buildRandomDatabase())
            .then((first) => {
                vi.stubEnv('RANDOM_DATA_SEED', '2');
                return loadMockProfiles()
                    .then((secondModule) => secondModule.buildRandomDatabase())
                    .then((second) => [first, second] as const);
            })
            .then(([first, second]) => {
                // Normalised for the same reason as the reproducibility test above — otherwise this
                // would trivially pass even if the seed were silently ignored, since two sequential
                // calls' wall-clock-anchored dates always differ regardless of RANDOM_DATA_SEED.
                expect(normalizeVolatileDates(second)).not.toEqual(normalizeVolatileDates(first));
            });
    });
});

describe('resolveMockSeed', () => {
    it('memoises the resolved seed within one module instance', () => {
        vi.stubEnv('RANDOM_DATA_SEED', '7');

        return loadMockProfiles().then(({ resolveMockSeed }) =>
            resolveMockSeed()
                .then((seed) => {
                    expect(seed).toBe(7);
                    return resolveMockSeed();
                })
                .then((seed) => {
                    expect(seed).toBe(7);
                })
        );
    });

    it('generates a fresh numeric seed when RANDOM_DATA_SEED is unset', () =>
        loadMockProfiles()
            .then(({ resolveMockSeed }) => resolveMockSeed())
            .then((seed) => {
                expect(Number.isFinite(seed)).toBe(true);
            }));

    it('persists the generated seed to sessionStorage, surviving a fresh module instance (a page reload)', () =>
        loadMockProfiles()
            .then((firstModule) => firstModule.resolveMockSeed())
            .then((first) =>
                // Simulates what cy.visit() does: a full page reload re-evaluates the module
                // (fresh instance, module-level memoisation gone) but the same browser tab's
                // sessionStorage survives — without that bridge this would draw a brand new
                // random seed instead.
                loadMockProfiles()
                    .then((secondModule) => secondModule.resolveMockSeed())
                    .then((second) => {
                        expect(second).toBe(first);
                    })
            ));

    it('draws a fresh seed once sessionStorage is cleared (a new browser tab / test)', () => {
        return loadMockProfiles()
            .then((firstModule) => firstModule.resolveMockSeed())
            .then((first) => {
                sessionStorage.clear();
                return loadMockProfiles()
                    .then((secondModule) => secondModule.resolveMockSeed())
                    .then((second) => {
                        expect(second).not.toBe(first);
                    });
            });
    });

    it('prefers an explicit RANDOM_DATA_SEED over whatever sessionStorage holds', () =>
        loadMockProfiles()
            // persists a fresh seed to sessionStorage
            .then((firstModule) => firstModule.resolveMockSeed())
            .then(() => {
                vi.stubEnv('RANDOM_DATA_SEED', '999');
                return loadMockProfiles();
            })
            .then(({ resolveMockSeed }) => resolveMockSeed())
            .then((seed) => {
                expect(seed).toBe(999);
            }));
});
