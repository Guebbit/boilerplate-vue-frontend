/**
 * The mock database, asserted across every module at once.
 *
 * Each domain owns its own fixtures now, so a single spec pinning "5 products, 2 cart items, 3
 * orders" would have to name every domain — reintroducing, in a test, exactly the coupling the
 * split removes, and surviving `rm -rf src/modules/products` as a failure in a shared file rather
 * than disappearing with it. Each module asserts its own records in `src/modules/<name>/tests/
 * seeds.spec.ts`.
 *
 * What is left here is what belongs to no domain: that the fold runs at all, that it runs in
 * dependency order, and that the random profile stays reproducible. Same shape as the backend's
 * `tests/cross-cutting/audit-actions.test.ts` — properties asserted structurally, over whatever
 * `src/modules.ts` happens to enable.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { AppModule, MockProfile } from '@/kernel/registry';

/**
 * Builds the database the way the real composition roots do, through a fresh module instance.
 *
 * `resetModules()` matters for the random profile: `resolveMockSeed()` memoises at module scope, so
 * two builds under different `RANDOM_DATA_SEED` values would otherwise share the first seed.
 */
const buildDatabase = async (profile: MockProfile): Promise<Record<string, unknown>> => {
    vi.resetModules();

    const { collectModuleMockSeeds } = await import('@/kernel/registry');
    const { enabledModules } = await import('@/modules');

    // One seeded stream for every domain, exactly as apiMock.ts does it.
    if (profile === 'random') await import('@mocks/mockRandom.ts').then((r) => r.seedFaker());

    // Read structurally on purpose: this spec asserts properties of the ASSEMBLY, so it must not
    // name a field any single module declares.
    return (await collectModuleMockSeeds(enabledModules, profile)) as unknown as Record<
        string,
        unknown
    >;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Blanks out ISO date strings so a comparison isn't defeated by wall-clock jitter — see the
 * reproducibility case below for why exact timestamps aren't part of what RANDOM_DATA_SEED promises. */
const normalizeVolatileDates = (value: unknown): unknown =>
    JSON.parse(
        JSON.stringify(value, (_key, entry) =>
            typeof entry === 'string' && ISO_DATE_PATTERN.test(entry) ? '<date>' : entry
        )
    ) as unknown;

/** A stand-in module contributing one field named after itself, for the collector's own edge cases. */
const makeStubModule = (name: string, after: string[] = []): AppModule => ({
    name,
    routes: [],
    mockSeeds: { after, build: () => Promise.resolve({ [name]: [] } as never) }
});

afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
});

describe.each(['seed', 'random'] as const)('the %s profile', (profile) => {
    it('assembles a database with a field from every contributing module', async () => {
        const { enabledModules } = await import('@/modules');
        const contributors = enabledModules.filter((appModule) => appModule.mockSeeds);
        const database = await buildDatabase(profile);

        // The count is not pinned to a number: this asserts that SOMETHING was contributed per
        // contributor, which is the property that survives adding or deleting a domain.
        expect(contributors.length).toBeGreaterThan(0);
        expect(Object.keys(database).length).toBeGreaterThanOrEqual(contributors.length);
    });

    it('leaves no declared collection undefined', async () => {
        const database = await buildDatabase(profile);

        for (const [field, value] of Object.entries(database))
            expect(value, `${field} was declared but never contributed`).toBeDefined();
    });
});

describe('dependency ordering', () => {
    /**
     * The property `mockSeeds.after` exists for: a module that derives from another's records sees
     * them in `soFar`. Asserted by observing what each builder was actually handed, rather than by
     * naming which domain derives from which.
     */
    it('hands every module the slices of the modules it declares itself after', async () => {
        vi.resetModules();
        const { collectModuleMockSeeds } = await import('@/kernel/registry');
        const { enabledModules } = await import('@/modules');

        const seenBy = new Map<string, string[]>();
        const instrumented = enabledModules
            .filter((appModule) => appModule.mockSeeds)
            .map(
                (appModule) =>
                    ({
                        ...appModule,
                        mockSeeds: {
                            after: appModule.mockSeeds!.after,
                            build: (context) => {
                                seenBy.set(appModule.name, Object.keys(context.soFar));
                                return appModule.mockSeeds!.build(context);
                            }
                        }
                    }) satisfies AppModule
            );

        await collectModuleMockSeeds(instrumented, 'seed');

        // Every module named in an `after` must already have run — and contributed something —
        // by the time the module that named it was handed its context.
        for (const appModule of instrumented)
            for (const earlier of appModule.mockSeeds.after ?? []) {
                expect(
                    seenBy.has(earlier),
                    `${appModule.name} declares after: ['${earlier}'] but ${earlier} never ran`
                ).toBe(true);
                expect(
                    seenBy.get(appModule.name) ?? [],
                    `${appModule.name} ran before ${earlier} contributed anything`
                ).not.toHaveLength(0);
            }
    });

    it('rejects a cycle rather than hanging or silently dropping a slice', async () => {
        vi.resetModules();
        const { collectModuleMockSeeds } = await import('@/kernel/registry');

        await expect(
            collectModuleMockSeeds(
                [makeStubModule('alpha', ['beta']), makeStubModule('beta', ['alpha'])],
                'seed'
            )
        ).rejects.toThrow(/Cycle in mockSeeds\.after/);
    });

    it('fails loudly when a module declares mockSeeds and contributes nothing', async () => {
        vi.resetModules();
        const { collectModuleMockSeeds } = await import('@/kernel/registry');

        const silent: AppModule = {
            name: 'silent',
            routes: [],
            mockSeeds: { build: () => Promise.resolve({}) }
        };

        await expect(collectModuleMockSeeds([silent], 'seed')).rejects.toThrow(
            /contributed no fields/
        );
    });
});

describe('the random profile', () => {
    it('is reproducible for a given RANDOM_DATA_SEED', async () => {
        vi.stubEnv('RANDOM_DATA_SEED', '42');
        const first = await buildDatabase('random');

        vi.stubEnv('RANDOM_DATA_SEED', '42');
        sessionStorage.clear();
        const second = await buildDatabase('random');

        // Normalised: faker's default `refDate` for `date.past()`/`date.recent()` is real
        // wall-clock time, so two sequential calls a few milliseconds apart never produce
        // byte-identical timestamps even under the same seed. What RANDOM_DATA_SEED actually
        // promises to reproduce is the STRUCTURE a bug report would need — which record is
        // inactive, which is empty, which ids are referenced, the quantities and totals — not the
        // exact millisecond a date field landed on.
        expect(normalizeVolatileDates(second)).toEqual(normalizeVolatileDates(first));
    });

    it('produces a different dataset for a different RANDOM_DATA_SEED', async () => {
        vi.stubEnv('RANDOM_DATA_SEED', '1');
        const first = await buildDatabase('random');

        vi.stubEnv('RANDOM_DATA_SEED', '2');
        sessionStorage.clear();
        const second = await buildDatabase('random');

        // Normalised for the same reason as above — otherwise this would trivially pass even if
        // the seed were silently ignored, since two sequential calls' wall-clock-anchored dates
        // always differ regardless of RANDOM_DATA_SEED.
        expect(normalizeVolatileDates(second)).not.toEqual(normalizeVolatileDates(first));
    });
});
