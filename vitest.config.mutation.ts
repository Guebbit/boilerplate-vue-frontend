import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Vitest config used only by Stryker (`npm run test:mutation`).
 *
 * Identical to `vitest.config.ts` except that `test.root` is dropped. Stryker copies the project
 * into `.stryker-tmp/sandbox-*` and runs vitest there. `vitest.config.ts` sets
 * `root: fileURLToPath(new URL('./', import.meta.url))`, which inside the sandbox resolves to the
 * sandbox directory itself; vitest then tries to load that DIRECTORY as a module and the dry run
 * dies with `ERR_LOAD_URL: Failed to load url .../.stryker-tmp/sandbox-XXXXXX` before a single
 * mutant is tested.
 *
 * ── WHY THIS IS `delete` AND NOT `root: undefined` ───────────────────────────────────────────────
 * Passing `root: undefined` through `mergeConfig` does NOTHING. Vite's merge walks the override
 * object and skips keys whose value is `undefined`, so the base `root` survives untouched and the
 * override reads as a fix while changing nothing. Removing the key AFTER the merge is what
 * actually drops it, and with it gone vitest falls back to its default — the current working
 * directory, which inside the sandbox is the sandbox. That is the correct answer rather than a
 * lucky one: the run should be rooted wherever the copy of the project is.
 *
 * ── THE ONE EXCLUDED SPEC ────────────────────────────────────────────────────────────────────────
 * `mutation-safe-imports.spec.ts` reads the files in the `mutate` scope as TEXT and checks each
 * unsafe import specifier carries a `Stryker disable` directive. Inside the sandbox those files are
 * Babel's instrumented OUTPUT, not the repo's source: a comment survives, but which node it is
 * printed above depends on where the mutation switch landed. The spec would therefore be asserting
 * on Babel's formatting, and a false failure there aborts the dry run — the exact failure mode it
 * exists to prevent. It kills no mutants, so dropping it costs no signal.
 *
 * Keep this file a thin override. Anything that belongs to the test setup belongs in
 * `vitest.config.ts`, so the mutation run and the normal run stay the same run.
 */
const mutationConfig = mergeConfig(
    baseConfig,
    defineConfig({
        test: {
            // On top of vitest's own defaults, which the base config also takes verbatim: the
            // build output, the HTML report and Stryker's scratch space are not test sources.
            exclude: [
                ...configDefaults.exclude,
                '**/dist/**',
                '**/.stryker-tmp/**',
                'reports/**',
                'tests/cross-cutting/mutation-safe-imports.spec.ts'
            ]
        }
    })
);

delete mutationConfig.test?.root;

export default mutationConfig;
