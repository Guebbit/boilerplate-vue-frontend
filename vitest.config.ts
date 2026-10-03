/**
 * Vitest configuration — the unit and component suite.
 *
 * ── Where each layer runs, so this file is not mistaken for the whole story ──────────────────
 * Vitest owns everything that can run in jsdom: pure functions, stores, composables, and single
 * components mounted with @vue/test-utils. Anything needing a real browser, a service worker or a
 * navigation belongs to Cypress (`cypress.config.ts`), and mutation testing merges its own
 * overrides on top of this file (`vitest.config.mutation.ts`).
 *
 * ── The one setting that is load-bearing: `thresholds.perFile` ───────────────────────────────
 * Coverage thresholds POOL by default. A glob covering twenty files passes if the average clears
 * the bar, so a fully covered utility can carry an untested composable next to it and the gate
 * stays green. `perFile: true` applies the number to each file separately and names the ones that
 * fail. Anything else measures the wrong thing.
 *
 * ── Vitest does NOT type-check ───────────────────────────────────────────────────────────────
 * A spec that fails to compile can still pass here, because the transform strips types without
 * checking them. `npm run type-check-only` is the check; a green test run is not evidence that
 * the file compiles.
 */
import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

// `vite.config.ts` exports a function (it reads VITE_APP_PORT through loadEnv), so it has to be
// resolved before mergeConfig, which merges plain objects. Resolving it here rather than
// exporting a function keeps this file's default export an object, which is what
// `vitest.config.mutation.ts` merges on top of.
const resolvedViteConfig = viteConfig({ command: 'serve', mode: 'test' });

/**
 * The floor every glob below shares, written once.
 *
 * The number is a policy, not a measurement, so raising it must raise it everywhere — five
 * separate copies is five chances to raise four of them. `src/app/guards/authentications.ts` is
 * deliberately NOT this object: its numbers are a record of where that file actually is, and
 * being different is the point.
 */
const COVERAGE_FLOOR = {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70
};

export default mergeConfig(
    resolvedViteConfig,
    defineConfig({
        test: {
            // Plain jsdom, with one class of parser noise filtered out.
            // See the file itself for why, and for how to go back to 'jsdom'.
            environment: './tests/support/unit/jsdom-quiet-css.environment.ts',
            setupFiles: ['tests/support/unit/setup.ts'],
            // Vitest's 5 s default is tuned for a developer's machine. CI runs the whole suite
            // under v8 coverage on a 4-vCPU runner, where mounting a full page spec takes 3-5x
            // longer and the last tests of a heavy file timed out on a green codebase.
            testTimeout: 15_000,
            // Two homes, deliberately. A module's own specs live inside it, so
            // `rm -rf src/modules/<name>` takes its tests with it; everything that belongs to no
            // single domain — app, kernel, ui, infrastructure, cross-cutting sweeps — stays
            // central under `tests/unit/` and `tests/cross-cutting/`.
            //
            // The e2e suite makes the same split for the same reason, so `src/modules/*/tests/`
            // holds both kinds. Only the `.spec.ts` half is this project's: the `e2e/` subfolder
            // is Cypress', claimed by `tsconfig.cypress.json` and excluded by
            // `tsconfig.vitest.json`. The glob below already draws that line.
            include: [
                'tests/unit/**/*.spec.ts',
                'tests/cross-cutting/**/*.spec.ts',
                'src/modules/*/tests/**/*.spec.ts'
            ],
            exclude: configDefaults.exclude,
            server: {
                deps: {
                    // vuetify ships raw .css imports in its ESM build
                    inline: ['@guebbit/vue-toolkit', 'vuetify']
                }
            },
            css: true,
            root: fileURLToPath(new URL('./', import.meta.url)),
            coverage: {
                provider: 'v8',
                reporter: ['text', 'html', 'lcov'],
                reportsDirectory: './coverage',
                // Without `include`, v8 reports only files a test imported — a source file
                // nobody tests is ABSENT from the report, not a 0% row. That is how
                // utils/formatters.ts sat completely untested with a clean coverage report
                // until the first Stryker run named it (see stryker.config.json). This glob is
                // the fix: every source file is in the denominator, so "no test at all" shows
                // up as 0% instead of showing up as nothing.
                include: ['src/**/*.{ts,vue}'],
                exclude: [
                    'src/**/*.d.ts',
                    'src/types/**', // type-only, no runtime lines
                    'src/main.ts', // app bootstrap, exercised by e2e only
                    'src/ui/vuetify/**', // vendor configuration
                    // A module's own specs live under `src/` so that deleting a domain takes
                    // its tests with it — but a test is not the thing being measured.
                    'src/modules/*/tests/**'
                ],
                thresholds: {
                    // Floors for logic Stryker also mutates, on the principle that logic worth
                    // mutating is logic worth guaranteeing is executed at all. Not an exact
                    // mirror of `stryker.config.json`'s `mutate`: that list is the wider of the
                    // two, because a file with no coverage is free to mutate and expensive to
                    // floor.
                    //
                    // Same rule as the Stryker thresholds: raise these when the number rises,
                    // never lower one to make a run pass.

                    // PER FILE, and this line is the whole gate rather than a detail.
                    //
                    // Without it, Vitest merges every file matching a glob into ONE coverage map
                    // and checks the threshold against the merged total (see `resolveThresholds`
                    // in @vitest/coverage-v8). A glob covering four files, three of them at 95%
                    // and one at 0%, passes a 70% floor comfortably — so the floor is satisfied
                    // by exactly the file it was meant to catch. That is how the backend's
                    // directory-shaped Jest thresholds hid four completely untested files, and
                    // the pooling is identical here.
                    //
                    // With `perFile`, each file is checked on its own and the error names it:
                    //   ERROR: Coverage for statements (0%) does not meet "src/infrastructure/**"
                    //   threshold (70%) for src/infrastructure/observability.ts
                    //
                    // It applies to every group below, so a new file under any of these paths
                    // arrives with a floor instead of arriving inside an average.
                    perFile: true,

                    // Every domain store. Two shapes: `store.ts` for the one store a module
                    // normally has, `stores/*.ts` for a module that genuinely has several — the
                    // arrangement `src/modules/account/` uses.
                    //
                    // A store outside both globs would lose its floor without anything failing,
                    // which is why `tests/cross-cutting/store-location.spec.ts` asserts every
                    // `defineStore` under `src/modules/` sits in one of exactly these two.
                    'src/modules/*/store.ts': COVERAGE_FLOOR,
                    'src/modules/*/stores/*.ts': COVERAGE_FLOOR,
                    // Every file under guards, `authentications.ts` included: `canAccess` gates
                    // on `meta.can`, not on a hand-kept role flag, and both branches are exercised
                    // (FA125 — the `isAdmin`-era exemption this glob used to carve out for it is
                    // gone along with `isAdmin` itself).
                    'src/app/guards/*.ts': COVERAGE_FLOOR,
                    'src/infrastructure/http/**': COVERAGE_FLOOR,

                    // FA131: the rest of `src/infrastructure/` had no floor at all — `session.ts`,
                    // i18n and observability could regress to nothing and nothing here would say
                    // so. `utils/**` folds in the two files that used to be listed on their own
                    // (`errors.ts`, `formatters.ts`); both already clear 70, so nothing narrows.
                    'src/infrastructure/*.ts': COVERAGE_FLOOR,
                    // The i18n runtime (FE-D5): extractable, so it lives at `src/i18n/`, not
                    // under `src/infrastructure/`. `locale-overrides.ts` stays behind — it's the
                    // contract-specific consumer of `@api` — and is covered by the glob above.
                    'src/i18n/!(country-label).ts': COVERAGE_FLOOR,
                    'src/infrastructure/observability/**': COVERAGE_FLOOR,
                    'src/infrastructure/utils/**': COVERAGE_FLOOR,
                    // Same "measured, not aspirational" record as `authentications.ts` above —
                    // this composable's country <select> options are exercised, the sparse
                    // "unrecognised code" branch is not.
                    'src/i18n/country-label.ts': {
                        statements: 75,
                        branches: 50,
                        functions: 100,
                        lines: 75
                    },

                    // FA131: the kernel — the module registry every domain wires itself into —
                    // had no floor either. One file today; the glob still covers whatever joins it.
                    'src/kernel/**': COVERAGE_FLOOR,

                    // FA131: pure client-side rules (`domain/`) and the store-to-component tier
                    // (`composables/`) — the two shapes `module-file-shapes.spec.ts` already
                    // reserves for exactly this kind of logic — carried no floor of their own.
                    // No `domain/` file sits below 70 today, so one blanket glob covers all of them.
                    'src/modules/*/domain/**': COVERAGE_FLOOR,
                    // Three modules' composables sit below 70 on at least one metric; each is
                    // excluded from the blanket below and given its own measured floor, the same
                    // split `guards/!(authentications).ts` uses for its one exception.
                    'src/modules/!(account|payments|products)/composables/**': COVERAGE_FLOOR,
                    'src/modules/account/composables/!(use-method-label).ts': COVERAGE_FLOOR,
                    'src/modules/payments/composables/!(use-order-refund).ts': COVERAGE_FLOOR,
                    'src/modules/products/composables/!(translation-tab-errors|use-active-locales).ts':
                        COVERAGE_FLOOR,
                    // Only the happy path (a label already on the map) is exercised.
                    'src/modules/account/composables/use-method-label.ts': {
                        statements: 100,
                        branches: 50,
                        functions: 100,
                        lines: 100
                    },
                    // The refund dialog's own error branches (an already-refunded order, a
                    // network failure) are the uncovered half.
                    'src/modules/payments/composables/use-order-refund.ts': {
                        statements: 83,
                        branches: 66,
                        functions: 71,
                        lines: 81
                    },
                    // The least-tested file this sweep found: only the single-error-per-tab case
                    // is covered, not the multi-tab or multi-error paths.
                    'src/modules/products/composables/translation-tab-errors.ts': {
                        statements: 53,
                        branches: 30,
                        functions: 57,
                        lines: 60
                    },
                    // Only the "some locale is active" branch is exercised, not "none are".
                    'src/modules/products/composables/use-active-locales.ts': {
                        statements: 100,
                        branches: 66,
                        functions: 100,
                        lines: 100
                    }
                }
            }
        }
    })
);
