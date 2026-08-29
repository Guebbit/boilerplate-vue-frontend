import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    server: {
        // The port lives here, not in the `dev` script, so the compose publish
        // (`${VITE_APP_PORT}:${VITE_APP_PORT}`) and the server it forwards to can never disagree.
        //
        // `loadEnv` reads both `.env` and `process.env`, so this works on the host and in the
        // container, where compose injects VITE_APP_PORT.
        //
        // A `--port` on the command line still wins — the e2e scripts rely on that to run on 8085.
        port: Number(loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_PORT) || 8080,
        // Fail instead of silently hopping to the next free port: a hop would leave the
        // container publishing a port nothing listens on, which is invisible until a
        // request is refused.
        strictPort: true,
        // Pre-transform the route entry points at server start instead of on first visit — `vite
        // dev` otherwise compiles a route the first time a browser asks for it, so the first click
        // pays for a build. Only used by the human-driven dev loop now (`npm run dev`,
        // `test:e2e:dev`); every headless e2e script builds once and serves with `vite preview`.
        //
        // Route views only — warming every file would just move the whole compile into startup.
        warmup: {
            clientFiles: [
                './src/main.ts',
                './src/app/layouts/*.vue',
                './src/app/views/*.vue',
                './src/modules/*/views/*.vue'
            ]
        }
    },
    plugins: [
        vue(),
        // auto-imports Vuetify components/directives on use (tree-shaken)
        vuetify({ autoImport: true }),
        tailwindcss(),
        // Excluded from a test run: there is no dev server to serve its inspector UI to, and
        // under Stryker's sandboxed project copy its path resolution breaks the run outright
        // before a single mutant is tested.
        ...(mode === 'test'
            ? []
            : [
                  vueDevTools({
                      // open webstorm instead of vscode when using the __devtools__
                      launchEditor: 'webstorm'
                  })
              ])
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('src', import.meta.url)),
            '@types': fileURLToPath(new URL('src/types', import.meta.url)),
            // '@api/schemas' must be declared before '@api': Vite matches a string alias
            // against both the exact key and `key + '/'` as a prefix, in declaration order,
            // so the shorter '@api' would otherwise shadow every '@api/schemas' import.
            '@api/schemas': fileURLToPath(new URL('contracts/rest/schemas.zod', import.meta.url)),
            '@api': fileURLToPath(new URL('contracts/rest/index', import.meta.url))
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ['legacy-js-api']
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
}));
