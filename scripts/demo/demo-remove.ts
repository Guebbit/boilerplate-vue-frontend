#!/usr/bin/env tsx
/**
 * `npm run demo:remove` — deletes every module
 * `src/demo-modules.ts` names, the one place that lists them, `src/modules.ts`, and their entries
 * in `scripts/module-edges.ts`. Everything else that reaches a domain module — `src/app/router/index.ts`,
 * `src/infrastructure/http/response-schema-map.ts` — already reads `enabledModules` generically,
 * so a module's own folder is the only place its name is written down.
 *
 * The cross-module specs under `tests/e2e/` go too: each names the modules it walks on a
 * `// requires-module:` line (`./demo-remove-tests`), the way the backend's specs do.
 *
 * RUNS AGAINST THIS CHECKOUT, not a scratch copy — see the backend's `scripts/ops/demo-remove.ts`
 * for the report-only MEASURE script this pairs with (`npm run measure:demo-strip`, this repo's
 * own copy). A module-owned spec under `src/modules/<name>/tests/` goes with its folder
 * automatically; the SYSTEM-level specs that walk the shop on purpose
 * (`docs/theory/module-lifecycle.md`, backend repo) are deleted by their `requires-module` header.
 * What the report still lists is a grep for an import this script did not recognise — the residue
 * a human has to judge.
 *
 * See: docs/getting-started-new-project.md
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDemoModuleNames } from './demo-module-names';
import {
    pruneModuleEdges,
    removeManifest,
    removeModuleFolders,
    stripModuleRegistry
} from './demo-remove-registry';
import { removeResidueSpecs } from './demo-remove-tests';

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Every file under `tests/` or a module's own `tests/` directory that still imports a deleted
 * module's path, via `git grep` — same technique, same reasoning, as the backend's own
 * `demo-remove.ts`.
 */
const findResidueTests = (names: readonly string[]): string[] => {
    const pattern = names.map((name) => `@/modules/${name}/|modules/${name}/`).join('|');
    try {
        // `git grep`: -l file names only, -E extended regex, -I skip binary. Exit 1 = no matches.
        // https://git-scm.com/docs/git-grep
        const result = execFileSync(
            'git',
            ['grep', '-l', '-I', '-E', pattern, '--', 'tests/', 'src/modules/'],
            { cwd: REPO_ROOT, encoding: 'utf8' }
        );
        return result.split('\n').filter((line) => line.length > 0);
    } catch (error: unknown) {
        const status = error instanceof Error && 'status' in error ? error.status : undefined;
        if (status === 1) return [];
        throw error;
    }
};

/** The demo modules to delete, read off `src/demo-modules.ts`. */
const demoModuleNames = readDemoModuleNames(REPO_ROOT);
console.info(
    `[demo-remove] removing ${demoModuleNames.length} demo module(s): ${demoModuleNames.join(', ')}`
);
console.info('\n[demo-remove] module folders:');
// Delete each demo module's folder.
for (const folder of removeModuleFolders(REPO_ROOT, demoModuleNames))
    console.info(`  ${folder}/ — deleted`);

console.info('\n[demo-remove] the module registry:');
stripModuleRegistry(REPO_ROOT, demoModuleNames);
console.info(`  src/modules.ts — removed ${demoModuleNames.join(', ')}`);
pruneModuleEdges(REPO_ROOT, demoModuleNames);
console.info('  scripts/module-edges.ts — dropped their entries');
console.info(`  ${removeManifest(REPO_ROOT).join(', ')} — deleted`);

console.info('\n[demo-remove] cross-module specs:');
// Remove the cross-module specs that walk a deleted module, and say why for each.
for (const note of removeResidueSpecs(REPO_ROOT, demoModuleNames))
    console.info(`  ${note.file} — ${note.detail}`);

console.info('\n[demo-remove] done. Next:');
console.info('  1. npm run type-check-only   — the module-owned specs are already gone');
console.info('  2. npm run lint              — catches an import eslint-plugin-boundaries refused');

/** Files that still import a deleted module, found by grep. */
const residue = findResidueTests(demoModuleNames);
// Name each leftover importer; fixing it is a human's call, not this script's.
if (residue.length > 0) {
    console.info('\n[demo-remove] still importing a deleted module, from a grep:');
    for (const file of residue) console.info(`  ${file}`);
}
