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
                    'src/features/*/store.ts': {
                        statements: 70,
                        branches: 70,
                        functions: 70,
                        lines: 70
                    },
                    'src/middlewares/**': {
                        statements: 70,
                        branches: 70,
                        functions: 70,
                        lines: 70
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
