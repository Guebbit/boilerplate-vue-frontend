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

export default mergeConfig(
    resolvedViteConfig,
    defineConfig({
        test: {
            // Plain jsdom, with one class of parser noise filtered out.
            // See the file itself for why, and for how to go back to 'jsdom'.
            environment: './tests/unit/jsdom-quiet-css.env.ts',
            setupFiles: ['tests/unit/setup.ts'],
            include: ['tests/unit/**/*.spec.ts'],
            exclude: [...configDefaults.exclude, 'e2e/**', 'src/**/__tests__/**'],
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
                    'src/plugins/vuetify/**' // vendor configuration
                ],
                thresholds: {
                    // Floors for the logic Stryker also mutates — the same paths as
                    // stryker.config.json's `mutate` array, on the principle that logic worth
                    // mutating is logic worth guaranteeing is executed at all.
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
                    //   ERROR: Coverage for statements (0%) does not meet "src/stores/**"
                    //   threshold (70%) for src/stores/observability.ts
                    //
                    // It applies to every group below, so a new file under any of these paths
                    // arrives with a floor instead of arriving inside an average.
                    perFile: true,

                    'src/features/*/store.ts': {
                        statements: 70,
                        branches: 70,
                        functions: 70,
                        lines: 70
                    },
                    // Everything under middlewares EXCEPT authentications.ts, which is written
                    // down below. The extglob negation is required rather than cosmetic: a file
                    // matching two glob keys lands in BOTH groups, so an exemption listed
                    // alongside the broad glob would still be failed by the broad glob. An
                    // exemption has to leave the glob to be one.
                    'src/middlewares/!(authentications).ts': {
                        statements: 70,
                        branches: 70,
                        functions: 70,
                        lines: 70
                    },
                    // Measured 2026-08-08, and the first thing `perFile: true` exposed: the
                    // pooled `src/middlewares/**` group passed 70 across the board while this
                    // file sat at 50% branches and 55% functions, carried by demoMiddleware.ts
                    // and localeChoice.ts at 100%.
                    //
                    // Floored at the measured value rounded down, NOT at an aspiration — this is
                    // a record of where it is, so a drop fails and an improvement can ratchet it
                    // up. It is the guard layer, so it is also the most valuable of the three to
                    // finish testing: the uncovered half is the failure paths of `tryRestoreAuth`
                    // and the admin branch of `isAdmin`.
                    'src/middlewares/authentications.ts': {
                        statements: 75,
                        branches: 50,
                        functions: 55,
                        lines: 80
                    },
                    'src/plugins/http/**': {
                        statements: 70,
                        branches: 70,
                        functions: 70,
                        lines: 70
                    },
                    'src/utils/errors.ts': {
                        statements: 70,
                        branches: 70,
                        functions: 70,
                        lines: 70
                    },
                    'src/utils/formatters.ts': {
                        statements: 70,
                        branches: 70,
                        functions: 70,
                        lines: 70
                    }
                }
            }
        }
    })
);
