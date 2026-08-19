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
        // interaction with a route pays for a build rather than for the app. Warming these moves
        // that cost to server startup, which `start-server-and-test` already waits through.
        //
        // No headless e2e script reads this server any more: every one of them builds once and
        // serves the result with `vite preview`, so nothing compiles while Cypress is driving.
        // What is left is the dev loop — `npm run dev` and `npm run test:e2e:dev`, where a human
        // is driving and HMR is the point.
        //
        // Route views only — warming every file would just relocate the whole compile into
        // startup.
        warmup: {
            clientFiles: [
                './src/main.ts',
                './src/app/layouts/*.vue',
                './src/app/views/*.vue',
                './src/modules/*/views/*.vue'
            ]
        }
    },
    optimizeDeps: {
        // Never pre-bundle the Guebbit packages.
        //
        // Vite caches pre-bundled dependencies in `node_modules/.vite/deps` and keys that cache
        // off the lockfile, not off package *contents* — which is exactly wrong for a package
        // that is `npm link`ed, since its content changes without the lockfile ever moving. The
        // dev server then keeps serving a stale build of it: a function added upstream arrives as
        // `undefined`, and the page dies with `X is not a function` while the unit tests and the
        // production build (both of which resolve fresh) stay green.
        //
        // Excluding them costs nothing — both ship ESM, so there is no CommonJS interop to
        // pre-bundle for — and it means a rebuild of either toolkit is picked up on reload.
        exclude: ['@guebbit/vue-toolkit', '@guebbit/js-toolkit']
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
        // Always resolve these to THIS app's copy, never to one nested inside a dependency.
        //
        // It matters while `@guebbit/*` is `npm link`ed: a linked package is a symlink to a
        // checkout that carries its own `vue` and `pinia` in devDependencies, and Vite would
        // happily load those too. Two Vue instances means `inject()` finds nothing and
        // `getActivePinia()` throws inside the toolkit while working fine everywhere else —
        // a failure that looks like a toolkit bug and is not.
        //
        // Harmless once the dependency comes from npm again (there is only one copy to pick),
        // so it stays in rather than being a step someone has to remember.
        dedupe: [
            'vue',
            'pinia',
            'vue-router',
            'vue-i18n',
            '@tanstack/query-core',
            // `@guebbit/js-toolkit` is also a runtime dependency of `@guebbit/vue-toolkit`, so a
            // nested copy of it sits inside that package. Without this, the app loads the linked
            // one and the toolkit loads its own — two copies of the same library, and the nested
            // one is an older build whose module shape the browser cannot read as named exports
            // (`does not provide an export named 'getUuid'`). Deduping keeps everything on the
            // app's copy, which is the one being developed against anyway.
            '@guebbit/js-toolkit'
        ],
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
