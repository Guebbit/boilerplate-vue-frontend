/**
 * @module
 * Each FE module's place on the `foundation | shop | example` axis and the siblings it may
 * reach, read from `src/modules/<name>/module.yaml` — the same two fields, `group` and
 * `dependsOn`, the paired backend keeps in its own `module.yaml`. Deleting a module folder
 * deletes its metadata, so nothing here goes stale.
 *
 * Group:
 * - `foundation` ships with every deployment.
 * - `shop` is the removable demo domain.
 * - `example` exists only to be copied.
 * - `npm run demo:remove` deletes `shop` and `example` ({@link demoModuleNames}), or the
 *   modules `--modules a,b,c` names ({@link resolveStripModules}).
 *
 * `dependsOn` holds BACKEND module names. One with no FE folder (`addresses`, `audit-logs`) is
 * fine: `account` folds address-book screens into itself. A module calling ITS OWN backend
 * counterpart needs no entry. The reason for each edge lives on the module's docs page
 * (`docs/modules/<module>.md`, "Its neighbourhood"); see `docs/understand/strategic-ddd.md` §2.
 *
 * Read by `eslint.config.ts` (coupling and foundation-may-not-import-shop), the demo scripts,
 * and the cross-cutting specs. A module with no `module.yaml`, or an invalid `group`, is
 * reported in `problems` and fails `tests/cross-cutting/module-groups.spec.ts`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

/** The groups a module may declare. */
export const MODULE_GROUP_NAMES = ['foundation', 'shop', 'example'] as const;

/** One module's place on the axis. */
export type ModuleGroup = (typeof MODULE_GROUP_NAMES)[number];

/**
 * What the loader read from a `src/modules` tree.
 *
 * - `folders`: every module folder on disk.
 * - `groups`: group by module name; a module with a missing or invalid group is absent.
 * - `edges`: `dependsOn` by module name; a module with no `dependsOn` is absent.
 * - `problems`: one sentence per module whose `module.yaml` is missing or invalid.
 */
export interface ModuleManifest {
    folders: string[];
    groups: Record<string, ModuleGroup>;
    edges: Record<string, string[]>;
    problems: string[];
}

/** The real `src/modules` directory, one level up from `scripts/`. */
const REAL_MODULES_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'modules'
);

/** Whether a value is one of {@link MODULE_GROUP_NAMES}. */
const isModuleGroup = (value: unknown): value is ModuleGroup =>
    new Set<unknown>(MODULE_GROUP_NAMES).has(value);

/** The string items of a YAML value, or none when it is not a list. */
const stringList = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * Reads every module's `module.yaml` under a `src/modules` tree.
 * Takes the root so a test can point it at a scratch tree.
 *
 * @param modulesRoot - a `src/modules` directory
 * @returns the manifest; never throws on a missing or invalid file, it lists it in `problems`
 */
export const loadModuleManifest = (modulesRoot: string): ModuleManifest => {
    const manifest: ModuleManifest = { folders: [], groups: {}, edges: {}, problems: [] };
    const folders = readdirSync(modulesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map(({ name }) => name)
        .toSorted();

    for (const name of folders) {
        manifest.folders.push(name);
        const file = path.join(modulesRoot, name, 'module.yaml');
        if (!existsSync(file)) {
            manifest.problems.push(`Module "${name}" has no module.yaml.`);
            continue;
        }
        /**
         * `yaml` package: `parse` turns the document into plain JS values (unknown shape).
         * https://eemeli.org/yaml/#yaml-parse
         */
        const fields = parse(readFileSync(file, 'utf8')) as {
            group?: unknown;
            dependsOn?: unknown;
        } | null;
        if (!isModuleGroup(fields?.group)) {
            manifest.problems.push(
                `Module "${name}" has no valid group in its module.yaml (${MODULE_GROUP_NAMES.join(' | ')}).`
            );
            continue;
        }
        manifest.groups[name] = fields.group;
        const dependsOn = stringList(fields.dependsOn);
        if (dependsOn.length > 0) manifest.edges[name] = dependsOn;
    }
    return manifest;
};

/** The manifest of this checkout's own `src/modules`. */
const real = loadModuleManifest(REAL_MODULES_ROOT);

/** Every FE module folder on disk. */
export const moduleFolderNames: readonly string[] = real.folders;

/** Every module's group, by name. */
export const moduleGroups: Record<string, ModuleGroup> = real.groups;

/** Every module's `dependsOn`, by name. */
export const moduleDependsOn: Record<string, string[]> = real.edges;

/** What is wrong with this checkout's module.yaml files, one sentence each. */
export const moduleManifestProblems: readonly string[] = real.problems;

/**
 * Every module `npm run demo:remove` deletes: the `shop` and `example` groups.
 *
 * @param groups - the group map to read; this checkout's by default
 * @returns the module names, in map order
 */
export const demoModuleNames = (groups: Record<string, ModuleGroup> = moduleGroups): string[] =>
    Object.entries(groups)
        .filter(([, group]) => group === 'shop' || group === 'example')
        .map(([name]) => name);

/**
 * The modules a strip takes: the `--modules` list when the command line has one, else every demo
 * module. A named list is taken as written, so `example` goes only when it is on the list.
 *
 * @param argv - the script's own arguments (`process.argv.slice(2)`)
 * @param folders - the module folders that exist; this checkout's by default
 * @param edges - every module's `dependsOn`; this checkout's by default
 * @returns the module folder names, each once
 * @throws {Error} when `--modules` is bare or empty, names a folder that is not a module, or
 *   leaves a module standing whose `dependsOn` names a stripped one
 */
export const resolveStripModules = (
    argv: readonly string[],
    folders: readonly string[] = moduleFolderNames,
    edges: Record<string, string[]> = moduleDependsOn
): string[] => {
    /**
     * Node: https://nodejs.org/api/util.html#utilparseargsconfig — `strict: false` lets other
     * flags through; a string option given with no value reads as `true`.
     */
    const { values } = parseArgs({
        args: [...argv],
        options: { modules: { type: 'string' } },
        strict: false,
        allowPositionals: true
    });
    if (values.modules === undefined) return demoModuleNames();
    // A bare `--modules` reads as `true`: no list, which the empty-list refusal below turns away.
    const requested = typeof values.modules === 'string' ? values.modules : '';

    const names = [
        ...new Set(
            requested
                .split(',')
                .map((name) => name.trim())
                .filter(Boolean)
        )
    ];
    if (names.length === 0) throw new Error('--modules names no module');

    const unknown = names.filter((name) => !folders.includes(name));
    if (unknown.length > 0)
        throw new Error(`--modules names no such module: ${unknown.join(', ')}`);

    const stranded = Object.entries(edges)
        .filter(([name]) => !names.includes(name))
        .flatMap(([name, dependencies]) =>
            dependencies
                .filter((dependency) => names.includes(dependency))
                .map((dependency) => `${name} depends on ${dependency}`)
        );
    if (stranded.length > 0)
        throw new Error(
            `--modules strips a module another one still needs: ${stranded.join('; ')}`
        );
    return names;
};

/**
 * Refuses a cycle anywhere in a `dependsOn` graph.
 *
 * `eslint.config.ts`'s per-module block only checks a module's OWN imports against its OWN
 * list, so `cart -> orders` beside `orders -> cart` would pass lint forever. A VALUE may name a
 * backend module with no FE folder. A key is a module folder by construction.
 *
 * @param edges - the graph to check: `moduleDependsOn` in production, a fixture in tests
 * @throws {Error} naming the cycle, on the first one found
 */
export const assertAcyclicModuleEdges = (edges: Record<string, string[]>): void => {
    /**
     * Standard DFS cycle check: `done` is a node whose whole subtree is known acyclic, `stack`
     * is the path from the sweep's root to the node being visited — a node reappearing on it IS
     * the cycle.
     */
    const done = new Set<string>();

    const visit = (node: string, stack: string[]): void => {
        if (done.has(node)) return;
        if (stack.includes(node))
            throw new Error(`dependsOn has a cycle: ${[...stack, node].join(' -> ')}.`);

        for (const next of edges[node] ?? []) visit(next, [...stack, node]);
        done.add(node);
    };

    for (const key of Object.keys(edges)) visit(key, []);
};
