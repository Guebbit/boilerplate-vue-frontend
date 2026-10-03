#!/usr/bin/env tsx
/**
 * FE-D4 step 1, the frontend twin of the backend's `measure:demo-strip` (G-D2): how far "the demo
 * shop is removable" actually is, measured rather than assumed. Copies the checkout to a SCRATCH
 * directory, deletes every module `src/demo-modules.ts` names, and runs `type-check-only`, `lint`
 * and `build-only` against what's left.
 *
 * NOT `demo:remove` — that script edits THIS checkout for real; this one applies the same edits
 * (`./demo-remove-registry`, `./demo-remove-tests`) to the copy. Report-only, on purpose, the same
 * reasoning as the backend's own copy: a red square here is a punch list, not a merge blocker.
 *
 * Runs against a SCRATCH COPY, never this checkout — `node_modules` is symlinked rather than
 * copied, and `.git` is deliberately never copied: this repo's `.git` is a worktree gitlink
 * pointing at shared metadata, and a git command run against a copy of it would stage changes
 * into the REAL checkout's index instead of a throwaway one.
 *
 * See: docs/getting-started-new-project.md (backend repo)
 */

import { cpSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
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

/** Where the scratch copy is assembled — under the OS temp directory, never under `REPO_ROOT`. */
const SCRATCH = path.join(os.tmpdir(), 'fe-demo-strip-measure');

/** Top-level entries never copied into the scratch tree — regenerated, symlinked, or shared. */
const SKIP_ENTRIES = new Set(['node_modules', '.git', 'dist', 'dist-e2e', 'coverage']);

/** One command this script runs against the scratch tree, and what it is asked about. */
interface Check {
    label: string;
    command: string;
    args: readonly string[];
}

/** `type-check-only`, `lint` and `build-only` — the three FE-D4 asks for. */
const CHECKS: readonly Check[] = [
    { label: 'type-check-only', command: 'npm', args: ['run', 'type-check-only'] },
    { label: 'lint', command: 'npm', args: ['run', 'lint'] },
    { label: 'build-only', command: 'npm', args: ['run', 'build-only'] }
];

/** Copy the checkout into `SCRATCH`, skipping what {@link SKIP_ENTRIES} names. */
const assembleScratchCopy = (): void => {
    rmSync(SCRATCH, { recursive: true, force: true });
    mkdirSync(SCRATCH, { recursive: true });

    cpSync(REPO_ROOT, SCRATCH, {
        recursive: true,
        filter: (source) => !SKIP_ENTRIES.has(path.relative(REPO_ROOT, source).split(path.sep)[0])
    });

    // Node resolves through the symlink exactly as it would a real directory — the scratch copy
    // needs working imports, not its own install.
    symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(SCRATCH, 'node_modules'), 'dir');
};

/**
 * Apply `demo:remove`'s own edits to the scratch copy: the module folders, the registry, the
 * coupling graph, the manifest and the cross-module specs. The checks below then ask whether what
 * is left stands up, which is the question `demo:remove` has to answer for a real checkout.
 */
const stripDemoModules = (names: readonly string[]): void => {
    removeModuleFolders(SCRATCH, names);
    stripModuleRegistry(SCRATCH, names);
    pruneModuleEdges(SCRATCH, names);
    removeManifest(SCRATCH);
    removeResidueSpecs(SCRATCH, names);
};

/**
 * Run one check against the scratch tree. Never throws — a failing command IS the measurement,
 * not this script's own error.
 * @param check - the command to run and what to call it in the report
 */
const run = (check: Check): boolean => {
    console.info(`\n[demo-strip] ${check.label}`);
    const result = spawnSync(check.command, check.args, { cwd: SCRATCH, stdio: 'inherit' });
    return result.status === 0;
};

const demoModuleNames = readDemoModuleNames(REPO_ROOT);
console.info(
    `[demo-strip] stripping ${demoModuleNames.length} demo module(s): ${demoModuleNames.join(', ')}`
);

assembleScratchCopy();
stripDemoModules(demoModuleNames);

const results = CHECKS.map((check) => ({ check, passed: run(check) }));

console.info('\n[demo-strip] summary — report-only, not a merge gate:');
for (const { check, passed } of results)
    console.info(`  ${passed ? 'PASS' : 'FAIL'}  ${check.label}`);

const allPassed = results.every((result) => result.passed);
console.info(
    allPassed
        ? '\n[demo-strip] the demo shop is removable today.'
        : '\n[demo-strip] the demo shop is NOT removable today — see the failing command(s) above.'
);

process.exitCode = allPassed ? 0 : 1;
