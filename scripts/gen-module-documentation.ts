#!/usr/bin/env tsx
/**
 * Write `docs/modules/` from the code that is actually running — `npm run docs:modules`.
 *
 * With `--check` it writes nothing and fails on the first page that has drifted, which is how it
 * earns its place in `npm run complete`: a module's page cannot describe a screen it no longer
 * routes to or an endpoint it no longer calls.
 *
 * The manifests are loaded through a Vite dev server rather than by `tsx` alone, because one
 * imports `.vue` components, path aliases and a Pinia store. `pinia` itself is resolved by node so
 * the stores this script instantiates share the one active instance it sets.
 *
 * See: docs/modules/index.md · docs/theory/module-lifecycle.md
 */

import { createServer } from 'vite';
import type { ManifestShape } from './module-docs/facts';
import { generateModuleDocumentation } from './module-docs';

const checkOnly = process.argv.includes('--check');

const run = async (): Promise<number> => {
    const server = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'error'
    });

    try {
        const pinia = await import('pinia');
        const registry = (await server.ssrLoadModule('/src/modules.ts')) as {
            enabledModules: readonly ManifestShape[];
        };
        /* Awaited inside the block, not returned from it: the server must still be open while the
         * generator loads stores and manifests through it, and `finally` runs the moment a bare
         * `return` hands its promise back. */
        const code = await generateModuleDocumentation(
            server,
            registry.enabledModules,
            pinia,
            checkOnly
        );
        return code;
    } finally {
        await server.close();
    }
};

void run().then((code) => {
    process.exitCode = code;
});
