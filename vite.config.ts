import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';

/** This package's own version, read once rather than imported — `resolveJsonModule` would pull
 * the whole file into the bundle's type graph for one field. */
const packageVersion = (JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string })
    .version;

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    // Every asset URL is generated relative to this at build time — an unset `VITE_APP_BASE_URL`
    // (or one already shaped as a bare path) is served from the domain root, same as today.
    base: loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_BASE_URL || '/',
    define: {
        __APP_VERSION__: JSON.stringify(packageVersion)
    },
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
        // `%APP_NAME%` in `index.html` becomes `VITE_APP_NAME` (default `Guebbit`) — the pre-boot
        // title and description, until the router writes the real one on the first navigation.
        // Vite's own `%VITE_X%` substitution leaves an unset variable as literal text; this one has
        // a default. https://vite.dev/guide/api-plugin#transformindexhtml
        {
            name: 'brand-index-html',
            transformIndexHtml: (html: string) =>
                html.replaceAll(
                    '%APP_NAME%',
                    (loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_NAME || 'Guebbit')
                        .replaceAll('&', '&amp;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('"', '&quot;')
                )
        },
        vue({
            template: {
                compilerOptions: {
                    // <altcha-widget> is a real custom element from the `altcha` package, not a
                    // component this app defines — without this Vue tries to resolve it and warns
                    // "failed to resolve component" on every page HumanCheck.vue mounts it on.
                    isCustomElement: (tag) => tag === 'altcha-widget'
                }
            }
        }),
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
                      // Which editor `__devtools__` opens a file in — a per-developer choice, not
                      // this repo's, so it reads the same `LAUNCH_EDITOR` convention vue-cli/CRA
                      // popularised rather than hard-coding one IDE.
                      launchEditor: process.env.LAUNCH_EDITOR || 'webstorm'
                  })
              ])
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('src', import.meta.url)),
            '@types': fileURLToPath(new URL('src/types', import.meta.url)),
            // '@api/schemas', '@api/error-codes', '@api/routes' and '@api/permission-actions' must all be declared before
            // '@api': Vite matches a string alias against both the exact key and `key + '/'` as a
            // prefix, in declaration order, so the shorter '@api' would otherwise shadow any of them.
            '@api/schemas': fileURLToPath(new URL('contracts/rest/schemas.zod', import.meta.url)),
            '@api/error-codes': fileURLToPath(
                new URL('contracts/rest/error-codes', import.meta.url)
            ),
            '@api/routes': fileURLToPath(new URL('contracts/rest/routes', import.meta.url)),
            '@api/permission-actions': fileURLToPath(
                new URL('contracts/permission-actions', import.meta.url)
            ),
            '@api': fileURLToPath(new URL('contracts/rest/index', import.meta.url))
        }
    },
    build: {
        // Written next to every chunk but never referenced from it (no `//# sourceMappingURL`),
        // so production never ships a source map to the browser — only an error tracker fed the
        // file directly (or a developer with the build artifact) can symbolicate a stack trace.
        sourcemap: 'hidden',
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
