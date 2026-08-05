import { mergeConfig, defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Vitest config used only by Stryker (`npm run test:mutation`).
 *
 * Identical to `vitest.config.ts` except that `test.root` is dropped. Stryker copies the project
 * into `.stryker-tmp/sandbox-*` and runs vitest there; an explicit `root` makes vitest resolve
 * the sandbox directory itself as a module and the dry run dies with `ERR_LOAD_URL` before a
 * single mutant is tested.
 *
 * Keep this file a thin override. Anything that belongs to the test setup belongs in
 * `vitest.config.ts`, so the mutation run and the normal run stay the same run.
 */
export default mergeConfig(
    baseConfig,
    defineConfig({
        test: {
            root: undefined,
            // The HTML report and Stryker's own scratch space are not test sources.
            exclude: ['**/node_modules/**', '**/dist/**', '**/.stryker-tmp/**', 'reports/**']
        }
    })
);
