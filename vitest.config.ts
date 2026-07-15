import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            include: ['tests/unit/**/*.spec.ts'],
            exclude: [...configDefaults.exclude, 'e2e/**', 'src/**/__tests__/**'],
            server: {
                deps: {
                    inline: ['@guebbit/vue-toolkit']
                }
            },
            root: fileURLToPath(new URL('./', import.meta.url)),
            coverage: {
                provider: 'v8',
                reporter: ['text', 'html', 'lcov'],
                reportsDirectory: './coverage'
            }
        }
    })
);
