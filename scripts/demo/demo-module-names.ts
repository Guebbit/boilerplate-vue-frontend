/**
 * @module
 * One shared reader for `src/demo-modules.ts`'s `DEMO_MODULE_NAMES` list, for the two scripts
 * under `scripts/demo/` that need it (`demo-remove.ts`, `measure-demo-strip.ts`).
 *
 * Reads the array as TEXT rather than importing it: `scripts/**` is its own TypeScript project
 * (`tsconfig.node.json`), separate from `src/**`'s (`tsconfig.app.json`) — `npm run
 * type-check-only` runs `vue-tsc --build`, which refuses a file used by a project but not listed
 * in it (TS6307), so a live `import` here would fail the exact check this manifest exists to keep
 * green. `src/demo-modules.ts` stays a plain, importable TypeScript module for its OTHER reader,
 * `tests/unit/demo-modules.spec.ts` (`tsconfig.vitest.json`, which — unlike `tsconfig.node.json` —
 * already includes `src/**`).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every name in `src/demo-modules.ts`'s `DEMO_MODULE_NAMES` array, read off the source text.
 * @param repoRoot - the checkout root to read `src/demo-modules.ts` from
 * @throws if the file's shape has changed and the array can no longer be found
 */
export const readDemoModuleNames = (repoRoot: string): string[] => {
    const source = readFileSync(path.join(repoRoot, 'src', 'demo-modules.ts'), 'utf8');
    const match = /DEMO_MODULE_NAMES = \[([^\]]*)]/.exec(source);
    if (!match)
        throw new Error('[demo-modules] could not find DEMO_MODULE_NAMES in src/demo-modules.ts');

    return [...match[1].matchAll(/'([\w-]+)'/g)].map(([, name]) => name);
};
