import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueDevTools({
            // open webstorm instead of vscode when using the __devtools__
            launchEditor: 'webstorm'
        })
    ],
    resolve: {
        alias: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '@': fileURLToPath(new URL('src', import.meta.url)),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '@types': fileURLToPath(new URL('src/types', import.meta.url)),
            // '@api/schemas' must be declared before '@api': Vite matches a string alias
            // against both the exact key and `key + '/'` as a prefix, in declaration order,
            // so the shorter '@api' would otherwise shadow every '@api/schemas' import.
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '@api/schemas': fileURLToPath(new URL('contracts/rest/schemas.zod', import.meta.url)),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '@api': fileURLToPath(new URL('contracts/rest/index', import.meta.url))
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ['legacy-js-api']
                // quietDeps: true
            }
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('/node_modules/@guebbit/vue-toolkit/'))
                        return 'guebbit-vue-toolkit';
                }
            }
        }
    }
});
