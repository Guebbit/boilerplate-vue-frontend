/**
 * @module
 * The specs that go with a removed module — `demo-remove.ts`'s test step, the FE twin of the
 * backend's `scripts/ops/demo-remove-tests.ts`.
 *
 * A spec is deleted whole when it says it needs a removed module on a `// requires-module: a, b`
 * line, or imports one. A module-owned spec under `src/modules/<name>/tests/` already went with its
 * folder; this is for the cross-module ones (`tests/e2e/specs/`), which no folder owns.
 *
 * Whole, not edited: a walk through the shop that lost the shop has nothing left to assert.
 */

import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

/** One deleted file, as the report prints it. */
export interface RemovalNote {
    /** Path relative to the repo root. */
    file: string;
    /** Why it went. */
    detail: string;
}

/**
 * The header a cross-module spec carries. `none` is a valid value: the spec needs no module and
 * says so, which is what tells a header that was forgotten from one that was meant.
 */
const REQUIRES_MODULE = /^\/\/ requires-module:\s*(.+)$/m;

/**
 * The module names a spec's header lists, or `undefined` when it has no header at all.
 * `none` yields an empty list.
 *
 * @param source - the spec's text
 */
export const requiredModules = (source: string): string[] | undefined => {
    const match = REQUIRES_MODULE.exec(source);
    if (!match) return undefined;

    return match[1]
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name !== 'none');
};

/** Every `.ts` file under a directory; an absent directory has none. */
const walkTypeScript = (directory: string): string[] =>
    existsSync(directory)
        ? readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
              const full = path.join(directory, entry.name);
              if (entry.isDirectory()) return walkTypeScript(full);
              return entry.name.endsWith('.ts') ? [full] : [];
          })
        : [];

/**
 * Whether a spec's source imports a removed module: a statement-leading `import`/`export ... from`
 * whose specifier is under `@/modules/<name>/`. Anchored to the line start so a fixture that only
 * QUOTES an import is not mistaken for one.
 *
 * @param source - the spec's text
 * @param names - the removed module names
 */
const importsRemovedModule = (source: string, names: readonly string[]): boolean =>
    new RegExp(
        String.raw`^\s*(?:import|export)\b[^"';]*?\bfrom\s+["']@/modules/(?:${names.join('|')})/`,
        'm'
    ).test(source);

/**
 * Delete every cross-module spec that needs a removed module.
 *
 * @param repoRoot - the checkout root
 * @param names - the removed module names (their folders are already gone)
 * @returns one note per deleted file
 */
export const removeResidueSpecs = (repoRoot: string, names: readonly string[]): RemovalNote[] => {
    const deleted = walkTypeScript(path.join(repoRoot, 'tests', 'e2e')).filter((file) => {
        const source = readFileSync(file, 'utf8');
        const needs = (requiredModules(source) ?? []).find((name) => names.includes(name));
        if (needs === undefined && !importsRemovedModule(source, names)) return false;

        unlinkSync(file);
        return true;
    });

    return deleted.map((file) => ({
        file: path.relative(repoRoot, file),
        detail: 'deleted — requires or imports a removed module'
    }));
};

/**
 * What is wrong with the `requires-module` headers under `tests/e2e/specs/`, one sentence each.
 *
 * Fail-closed in both directions: a spec in `journeys/` with no header would survive
 * `demo:remove` and then fail on a module that is gone; a header naming a module that does not
 * exist would never match one and leave its spec behind the same way.
 *
 * @param repoRoot - the checkout root
 * @param knownModules - every module name that exists (`scripts/module-groups.ts`'s keys)
 * @returns the problems; empty when every header is sound
 */
export const headerProblems = (repoRoot: string, knownModules: readonly string[]): string[] =>
    walkTypeScript(path.join(repoRoot, 'tests', 'e2e', 'specs')).flatMap((file) => {
        const relative = path.relative(repoRoot, file).split(path.sep).join('/');
        const required = requiredModules(readFileSync(file, 'utf8'));

        if (required === undefined)
            return relative.includes('/journeys/')
                ? [`${relative} has no "// requires-module: a, b" (or "none") line.`]
                : [];

        return required
            .filter((name) => !knownModules.includes(name))
            .map((name) => `${relative} requires "${name}", which is not a module.`);
    });
