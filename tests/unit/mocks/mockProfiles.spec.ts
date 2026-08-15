/**
 * Profile selection and the RNG seed — the mock layer's own logic, isolated from the Cypress layer.
 *
 * What is deliberately NOT here any more: assertions about the CONTENT of either dataset. Products,
 * users, carts and orders are contributed by their own modules now, so a case pinning "5 products"
 * in this file would name a domain the mock layer no longer knows about — and would survive
 * `rm -rf src/modules/products` as a failure in a shared file rather than disappearing with it.
 * Those assertions live in `tests/cross-cutting/mockSeedAssembly.spec.ts`, which discovers whatever
 * is enabled instead of listing it.
 *
 * `resetModules()` + a fresh dynamic `import()` per case: `resolveMockSeed()` memoises its result at
 * module scope (inside `mockRandom.ts`, reached through a dynamic import), so
 * reproducibility/variance checks need a genuinely fresh module instance per seed, not just a
 * re-stubbed env var read by an already-memoised function.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const loadMockProfiles = () => {
    vi.resetModules();
    return import('@mocks/mockProfiles.ts');
};

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
