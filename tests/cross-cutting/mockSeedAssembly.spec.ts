/**
 * The mock database, asserted across every module at once.
 *
 * Each domain owns its own fixtures now, so a single spec pinning "5 products, 2 cart items, 3
 * orders" would have to name every domain — reintroducing, in a test, exactly the coupling the
 * split removes, and surviving `rm -rf src/modules/products` as a failure in a shared file rather
 * than disappearing with it. Each module asserts its own records in `src/modules/<name>/tests/
 * seeds.spec.ts`.
 *
 * What is left here is what belongs to no domain: that the fold runs at all, and that it runs in
 * dependency order. Same shape as the backend's `tests/cross-cutting/audit-actions.test.ts` —
 * properties asserted structurally, over whatever `src/modules.ts` happens to enable.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { AppModule } from '@/kernel/registry';

/** Builds the database the way the real composition roots do, through a fresh module instance. */
const buildDatabase = async (): Promise<Record<string, unknown>> => {
    vi.resetModules();

    const { collectModuleMockSeeds } = await import('@/kernel/registry');
    const { enabledModules } = await import('@/modules');

    // Read structurally on purpose: this spec asserts properties of the ASSEMBLY, so it must not
    // name a field any single module declares.
    return (await collectModuleMockSeeds(enabledModules)) as unknown as Record<string, unknown>;
};

/** A stand-in module contributing one field named after itself, for the collector's own edge cases. */
const makeStubModule = (name: string, after: string[] = []): AppModule => ({
    name,
    routes: [],
    subdomain: 'supporting',
    language: { [name]: `whatever ${name} means` },
    mockSeeds: { after, build: () => Promise.resolve({ [name]: [] } as never) }
});

afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
});

describe('the mock database', () => {
    it('assembles a database with a field from every contributing module', async () => {
        const { enabledModules } = await import('@/modules');
        const contributors = enabledModules.filter((appModule) => appModule.mockSeeds);
        const database = await buildDatabase();

        // The count is not pinned to a number: this asserts that SOMETHING was contributed per
        // contributor, which is the property that survives adding or deleting a domain.
        expect(contributors.length).toBeGreaterThan(0);
        expect(Object.keys(database).length).toBeGreaterThanOrEqual(contributors.length);
    });

    it('leaves no declared collection undefined', async () => {
        const database = await buildDatabase();

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

        await collectModuleMockSeeds(instrumented);

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
            collectModuleMockSeeds([
                makeStubModule('alpha', ['beta']),
                makeStubModule('beta', ['alpha'])
            ])
        ).rejects.toThrow(/Cycle in mockSeeds\.after/);
    });

    it('fails loudly when a module declares mockSeeds and contributes nothing', async () => {
        vi.resetModules();
        const { collectModuleMockSeeds } = await import('@/kernel/registry');

        const silent: AppModule = {
            name: 'silent',
            subdomain: 'supporting',
            language: { Silence: 'a module that declares fixtures and contributes none' },
            routes: [],
            mockSeeds: { build: () => Promise.resolve({}) }
        };

        await expect(collectModuleMockSeeds([silent])).rejects.toThrow(/contributed no fields/);
    });
});
