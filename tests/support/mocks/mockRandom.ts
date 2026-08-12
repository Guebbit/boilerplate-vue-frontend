/**
 * The random profile's shared machinery: the seeded faker instance, and the seed that makes a
 * run reproducible.
 *
 * The DATA is not here. Each domain builds its own random slice in
 * `src/modules/<name>/mocks/seeds.ts`, so this file names no domain and deleting a module takes
 * its generator with it. What is left is the part every generator needs and no domain owns.
 *
 * ── Why this file is reached only through a dynamic import ────────────────────────────────────
 * It is the only thing in the mock layer that pulls in `@faker-js/faker`, and the module seed
 * files that use it also pull in the 4 800-line `tests/support/mocks/generated.ts`. Importing
 * either statically would drag both into the SEED profile's module graph — every
 * `npm run test:e2e` run, not just `test:e2e:random` — and on a cold `vite dev` boot that
 * triggers Vite's one-time dependency-pre-bundling reload, which races page-load assertions in
 * specs that never touch the random profile. Every import of this module, and of a module's
 * `seedsRandom`, is therefore behind `profile === 'random'`.
 *
 * Design constraints the per-module generators must satisfy (full rationale in
 * docs/tools/mocking.md):
 *
 * 1. Vary the data, never the handlers. Only what the slice builders return changes; every
 *    handler in a module's `mocks/handlers.ts` runs exactly the same logic against it either way.
 * 2. The generated factories are per-operation response envelopes, not entity factories — they
 *    return `{ success, status, message, data }` with garbage envelope fields
 *    (`status: faker.number.int()`, `message: faker.string.alpha(...)`). Only `.data` is used;
 *    the envelope is discarded, and handlers build the real one via `createSuccessEnvelope`.
 * 3. Auth identity stays fixed. `cy.loginAs()` types `root@root.it` / `gino@pino.it` into a real
 *    form — randomising id/email/admin would break login itself. Only cosmetic fields
 *    (`username`, `imageUrl`, timestamps) are randomised; `active` is pinned `true` for both so
 *    login never randomly fails on an inactive account.
 * 4. Relations stay coherent. Each factory call generates its response independently, so a fresh
 *    call for cart items or orders would reference product ids that don't exist. This is what
 *    `mockSeeds.after` is for: products are built first, and the dependent domains draw from the
 *    ids in `soFar`. `cartItemToOrderItem` in `mockShared.ts` does a non-null-asserted `find(...)`
 *    on product id and throws on incoherent data — the canary that this relinking is wrong.
 * 5. Role-scoping branches must survive randomisation. `isVisibleToCaller` (`mockShared.ts`)
 *    hides inactive and soft-deleted products from non-admins; the fixed seed exercises both
 *    branches on purpose (one of each). The random generator force-patches specific products to
 *    guarantee at least one of each, or the profile silently stops testing a branch.
 * 6. The RNG is seeded and the seed is logged. `seedFaker()` is called ONCE per database build,
 *    before any slice is generated — see `collectModuleMockSeeds`'s caller in `apiMock.ts`. If
 *    each module seeded independently they would all draw the same stream; if none did, "random"
 *    would mean "flaky and unreproducible".
 *
 * On the seed's name: `RANDOM_DATA_SEED` carries no `VITE_` prefix because the paired backend
 * reads a variable of exactly the same name for its own generator (`tests/helpers/contract-data.ts`
 * there) — `vite.config.ts` widens `envPrefix` for this one variable so it reaches
 * `import.meta.env` at all. The two sides keep separate PRNGs and, given one seed, produce
 * unrelated values; the shared name exists so a seed quoted in a failure report means something
 * in both repos, not so the streams agree.
 */
import { faker } from '@faker-js/faker';

// Re-exported so each module's `seedsRandom.ts` draws from THIS instance — the one `seedFaker()`
// below points at the run's seed. Importing `@faker-js/faker` directly from a module would work
// and would silently opt that domain out of reproducibility.
export { faker } from '@faker-js/faker';

// A full page reload (which every cy.visit() causes) re-evaluates this module from scratch, so a
// plain module-level `let` would re-roll a fresh seed on every navigation — "random" would mean
// "different on every page load" instead of "different per run". sessionStorage survives a
// reload within the same browser tab, so a freshly-generated seed is persisted there the same
// way mockShared.ts persists `currentAuthenticatedUserId` across reloads, for the same reason.
const MOCK_SEED_STORAGE_KEY = 'mock_randomProfileSeed';

const tryGetSessionStorage = (key: string): string | undefined => {
    try {
        if (typeof sessionStorage === 'undefined') return undefined;
        return sessionStorage.getItem(key) ?? undefined;
    } catch {
        return undefined;
    }
};

const trySetSessionStorage = (key: string, value: string): void => {
    try {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.setItem(key, value);
    } catch {
        // ignore storage errors (e.g. in non-browser environments)
    }
};

let resolvedSeed: number | undefined;

/**
 * The RNG seed for the random profile: `RANDOM_DATA_SEED` when set to a finite number, otherwise a
 * fresh value generated once per browser tab and persisted to sessionStorage — resolved once and
 * memoised per module instance too, so every database build across a test run (i.e. every
 * `cy.resetState()` / `cy.visit()` reload between specs) reproduces the exact same dataset, rather
 * than drifting further from what a failure was reported against.
 */
export const resolveMockSeed = (): number => {
    if (resolvedSeed !== undefined) return resolvedSeed;

    const envSeed = import.meta.env.RANDOM_DATA_SEED;
    const parsedEnvSeed = envSeed ? Number(envSeed) : Number.NaN;
    if (Number.isFinite(parsedEnvSeed)) {
        resolvedSeed = parsedEnvSeed;
        return resolvedSeed;
    }

    const storedSeed = tryGetSessionStorage(MOCK_SEED_STORAGE_KEY);
    const parsedStoredSeed = storedSeed ? Number(storedSeed) : Number.NaN;
    if (Number.isFinite(parsedStoredSeed)) {
        resolvedSeed = parsedStoredSeed;
        return resolvedSeed;
    }

    resolvedSeed = Math.floor(Math.random() * 1e9);
    trySetSessionStorage(MOCK_SEED_STORAGE_KEY, String(resolvedSeed));
    return resolvedSeed;
};

/**
 * Point the shared faker instance at this run's seed.
 *
 * Called once per database build, before the first slice — constraint 6 above. Every module's
 * generator then draws from the same seeded stream, in `mockSeeds.after` order, which is what
 * makes one `RANDOM_DATA_SEED` reproduce the whole dataset rather than each domain separately.
 */
export const seedFaker = (): void => {
    faker.seed(resolveMockSeed());
};
