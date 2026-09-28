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
import { readDemoModuleNames } from './demo-module-names';

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Delete every demo module's own folder under `src/modules/`. */
const removeModuleFolders = (names: readonly string[]): void => {
    for (const name of names) {
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
const stripModuleRegistry = (names: readonly string[]): void => {
    const file = path.join(REPO_ROOT, 'src', 'modules.ts');
    const before = readFileSync(file, 'utf8');
    const importPattern = new RegExp(`from '@/modules/(?:${names.join('|')})/module'`);
    const entryPattern = new RegExp(String.raw`^\s*(?:${names.join('|')}),?\s*$`);

    const after = before
        .split('\n')
        .filter((line) => !importPattern.test(line))
        .filter((line) => !entryPattern.test(line))
        .join('\n');

    writeFileSync(file, after);
    console.info(`  src/modules.ts — removed ${names.join(', ')}`);
};

/**
 * Delete `src/demo-modules.ts` and its reader — their whole job was naming modules that no longer
 * exist. `scripts/demo/demo-module-names.ts` stays: `measure-demo-strip.ts` still needs it for
 * whatever this build's module set becomes next.
 */
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

const demoModuleNames = readDemoModuleNames(REPO_ROOT);
console.info(
    `[demo-remove] removing ${demoModuleNames.length} demo module(s): ${demoModuleNames.join(', ')}`
);
console.info('\n[demo-remove] module folders:');
removeModuleFolders(demoModuleNames);

console.info('\n[demo-remove] the module registry:');
stripModuleRegistry(demoModuleNames);
removeManifest();

console.info('\n[demo-remove] done. Next:');
console.info('  1. npm run type-check-only   — the module-owned specs are already gone');
console.info('  2. npm run lint              — catches an import eslint-plugin-boundaries refused');

const residue = findResidueTests(demoModuleNames);
if (residue.length > 0) {
    console.info('\n[demo-remove] candidates, from a grep for the deleted modules:');
    for (const file of residue) console.info(`  ${file}`);
}
