/**
 * Which dataset the mock backend is populated with, and nothing about what is in it.
 *
 * The two profiles, selected by `VITE_MOCK_PROFILE`:
 *
 * - `seed` — the fixed fixtures, mirroring the BE's `db/seeds/index.ts`. The default every
 *   existing spec runs under.
 * - `random` — faker-seeded, contract-valid data. See `./mockRandom.ts`.
 *
 * The DATA for both lives in the modules: each domain contributes its slice through
 * `mockSeeds` in `src/modules/<name>/module.ts`, and `collectModuleMockSeeds` folds them
 * together. This file names no domain, so adding or deleting one never touches it — which is the
 * whole reason the builders left. See `docs/theory/modules.md`.
 */
import type { TMockProfile } from '@/kernel/registry';

export type { TMockProfile } from '@/kernel/registry';

/**
 * Which profile is active. Reads `VITE_MOCK_PROFILE`; anything other than the literal
 * `'random'` — including unset — is the default, fixed-seed profile.
 */
export const resolveProfile = (): TMockProfile =>
    import.meta.env.VITE_MOCK_PROFILE === 'random' ? 'random' : 'seed';

/**
 * The RNG seed backing the random profile — see `./mockRandom.ts` for how it is resolved and why
 * it is memoised. Reached through a dynamic import so the seed profile never pulls
 * `@faker-js/faker` into its module graph, and exposed here so callers that only need the seed for
 * logging (`apiMock.ts`) don't need to know the random profile is a separate module.
 *
 * Dynamically imported on every call rather than caching the module reference: a dynamic import of
 * an already-loaded specifier resolves to the same cached module instance and is effectively free,
 * so there is no benefit to hand-rolling a cache, only a way to get it wrong.
 */
export const resolveMockSeed = (): Promise<number> =>
    import('./mockRandom.ts').then((random) => random.resolveMockSeed());
