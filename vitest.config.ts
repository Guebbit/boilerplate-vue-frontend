import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

const toolkitEsmEntry = fileURLToPath(
    new URL('node_modules/@guebbit/vue-toolkit/dist/index.js', import.meta.url)
);

export default mergeConfig(
    viteConfig,
    defineConfig({
        resolve: {
            alias: {
                ['@guebbit/vue-toolkit']: toolkitEsmEntry
            }
        },
        test: {
            environment: 'jsdom',
            exclude: [...configDefaults.exclude, 'e2e/**'],
            root: fileURLToPath(new URL('./', import.meta.url))
        }
    })
);
