/**
 * Vitest configuration — the unit and component suite.
 *
 * ── Where each layer runs, so this file is not mistaken for the whole story ──────────────────
 * Vitest owns everything that can run in jsdom: pure functions, stores, composables, and single
 * components mounted with @vue/test-utils. Anything needing a real browser, a service worker or a
 * navigation belongs to Cypress (`cypress.config.ts`), and mutation testing merges its own
 * overrides on top of this file (`vitest.config.mutation.ts`).
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
 * The Vitest config: the app's resolved Vite config with the test settings merged over it.
 * `mergeConfig` deep-merges its second argument into the first.
 * https://vitest.dev/config/
 */
export default mergeConfig(
    resolvedViteConfig,
    defineConfig({
        test: {
            // Plain jsdom, with one class of parser noise filtered out.
            // See the file itself for why, and for how to go back to 'jsdom'.
            environment: './tests/support/unit/jsdom-quiet-css.environment.ts',
            setupFiles: ['tests/support/unit/setup.ts'],
            // Vitest's 5 s default is tuned for a developer's machine. CI runs the whole suite
            // on a 4-vCPU runner, where mounting a full page spec takes 3-5x
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
            root: fileURLToPath(new URL('./', import.meta.url))
        }
    })
);
