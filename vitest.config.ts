import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            setupFiles: ['tests/unit/vitest.setup.ts'],
            include: ['tests/unit/**/*.spec.ts'],
            exclude: [...configDefaults.exclude, 'e2e/**', 'src/**/__tests__/**'],
            server: {
                deps: {
                    inline: ['@guebbit/vue-toolkit', 'vuetify']
                }
            },
            root: fileURLToPath(new URL('./', import.meta.url))
        }
    })
);
