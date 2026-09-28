#!/usr/bin/env tsx
/**
 * FE-D4 (paired with the backend's G-D2): `npm run demo:remove` — deletes every module
 * `src/demo-modules.ts` names, and the one place that lists them, `src/modules.ts`. Everything
 * else that reaches a domain module — `src/app/router/index.ts`,
 * `src/infrastructure/http/response-schema-map.ts` — already reads `enabledModules` generically,
 * so a module's own folder is the only place its name is written down.
 *
 * RUNS AGAINST THIS CHECKOUT, not a scratch copy — see the backend's `scripts/ops/demo-remove.ts`
 * for the report-only MEASURE script this pairs with (`npm run measure:demo-strip`, this repo's
 * own copy). A module-owned spec under `src/modules/<name>/tests/` goes with its folder
 * automatically; `commerce.cy.ts`, `journey.cy.ts` and `storefront.cy.ts` under
 * `tests/e2e/specs/` are SYSTEM-level specs that walk the shop on purpose
 * (`docs/theory/module-lifecycle.md`, backend repo) and this script's own report lists them as
 * exactly the residue a human has to judge, the same as the backend's.
 *
 * See: docs/getting-started-new-project.md
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_MODULE_NAMES } from '../../src/demo-modules';

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Delete every demo module's own folder under `src/modules/`. */
const removeModuleFolders = (): void => {
    for (const name of DEMO_MODULE_NAMES) {
        const folder = path.join(REPO_ROOT, 'src', 'modules', name);
        rmSync(folder, { recursive: true, force: true });
        console.info(`  src/modules/${name}/ — deleted`);
    }
};

/**
 * Edit `src/modules.ts`: drop each demo module's import and its `enabledModules` array entry.
 * Every demo module name is a single word, so an import (`import cart from …`) and an array
 * element (`    cart,`) both spell it the same bare way — one filter catches both shapes.
 */
const stripModuleRegistry = (): void => {
    const file = path.join(REPO_ROOT, 'src', 'modules.ts');
    const before = readFileSync(file, 'utf8');
    const importPattern = new RegExp(`from '@/modules/(?:${DEMO_MODULE_NAMES.join('|')})/module'`);
    const entryPattern = new RegExp(String.raw`^\s*(?:${DEMO_MODULE_NAMES.join('|')}),?\s*$`);

    const after = before
        .split('\n')
        .filter((line) => !importPattern.test(line))
        .filter((line) => !entryPattern.test(line))
        .join('\n');

    writeFileSync(file, after);
    console.info(`  src/modules.ts — removed ${DEMO_MODULE_NAMES.join(', ')}`);
};

/** Delete `src/demo-modules.ts` itself — its whole job was naming modules that no longer exist. */
const removeManifest = (): void => {
    rmSync(path.join(REPO_ROOT, 'src', 'demo-modules.ts'), { force: true });
    rmSync(path.join(REPO_ROOT, 'tests', 'unit', 'demo-modules.spec.ts'), { force: true });
    console.info('  src/demo-modules.ts, tests/unit/demo-modules.spec.ts — deleted');
};

/**
 * Every file under `tests/` or a module's own `tests/` directory that still imports a deleted
 * module's path, via `git grep` — same technique, same reasoning, as the backend's own
 * `demo-remove.ts`.
 */
const findResidueTests = (): string[] => {
    const pattern = DEMO_MODULE_NAMES.map((name) => `@/modules/${name}/|modules/${name}/`).join(
        '|'
    );
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

console.info(
    `[demo-remove] removing ${DEMO_MODULE_NAMES.length} demo module(s): ${DEMO_MODULE_NAMES.join(', ')}`
);
console.info('\n[demo-remove] module folders:');
removeModuleFolders();

console.info('\n[demo-remove] the module registry:');
stripModuleRegistry();
removeManifest();

console.info('\n[demo-remove] done. Next:');
console.info('  1. npm run type-check-only   — the module-owned specs are already gone');
console.info('  2. npm run lint              — catches an import eslint-plugin-boundaries refused');

const residue = findResidueTests();
if (residue.length > 0) {
    console.info('\n[demo-remove] candidates, from a grep for the deleted modules:');
    for (const file of residue) console.info(`  ${file}`);
}
