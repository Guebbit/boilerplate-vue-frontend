import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    // `RANDOM_DATA_SEED` is the one env var this repo reads without a `VITE_` prefix, and it is
    // deliberate: the paired backend reads a variable of exactly the same name to seed its own
    // contract-data generator (tests/helpers/contract-data.ts). Two names for one concept meant a
    // seed printed by a failing nightly run said nothing to the other side; one name means the
    // number in a failure report is directly usable in either repo.
    //
    // Listing it here *replaces* the default prefix list, so 'VITE_' has to be restated or every
    // other env var in the app silently disappears from import.meta.env.
    envPrefix: ['VITE_', 'RANDOM_DATA_SEED'],
    server: {
        // The port lives here, not in the `dev` script, so the compose publish
        // (`${VITE_APP_PORT}:${VITE_APP_PORT}`) and the server it forwards to can never
        // disagree. loadEnv reads `.env` AND process.env, so it works both on the host and
        // in the container, where compose injects VITE_APP_PORT. A `--port` on the command
        // line still wins — the e2e scripts rely on that to run on 8085.
        port: Number(loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_PORT) || 8080,
        // Fail instead of silently hopping to the next free port: a hop would leave the
        // container publishing a port nothing listens on, which is invisible until a
        // request is refused.
        strictPort: true,
        // Pre-transform the route entry points at server start instead of on first visit.
        //
        // `vite dev` compiles a route the first time a browser asks for it, so the first
        // assertion of an e2e spec waits for a build rather than for the app. That fits inside
        // Cypress' timeout on an idle machine and does not on a busy one — a full-suite run on
        // a loaded box failed the first two assertions of auth.cy.ts while the same spec passed
        // cold in isolation. Warming these moves the cost to server startup, which
        // `start-server-and-test` already waits through.
        //
        // This is a mitigation, not the cure: the cure is running e2e against a production
        // build. Route views only — warming every file would just relocate the whole compile
        // into startup.
        warmup: {
            clientFiles: [
                './src/main.ts',
                './src/layouts/*.vue',
                './src/views/*.vue',
                './src/features/*/views/*.vue'
            ]
        }
    },
    plugins: [
        vue(),
        // auto-imports Vuetify components/directives on use (tree-shaken)
        vuetify({ autoImport: true }),
        tailwindcss(),
        vueDevTools({
            // open webstorm instead of vscode when using the __devtools__
            launchEditor: 'webstorm'
        })
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
}));
