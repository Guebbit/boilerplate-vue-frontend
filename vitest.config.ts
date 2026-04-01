import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        resolve: {
            alias: {
                '@guebbit/vue-toolkit': fileURLToPath(
                    new URL('./node_modules/@guebbit/vue-toolkit/dist/index.js', import.meta.url)
                )
            }
        },
        test: {
            environment: 'jsdom',
            exclude: [...configDefaults.exclude, 'e2e/**'],
            root: fileURLToPath(new URL('./', import.meta.url))
        }
    })
);
