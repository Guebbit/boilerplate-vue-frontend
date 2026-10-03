/**
 * @module
 * The registry edits a module removal makes, shared by `demo-remove.ts` (which applies them to
 * this checkout) and `measure-demo-strip.ts` (which applies them to a scratch copy and asks
 * whether what is left still builds).
 *
 * Both read the same code on purpose: a measure that deleted folders alone would only report the
 * edits `demo:remove` makes for you, and stay red whatever the repo's real coupling is.
 *
 * Every function takes the checkout root as an argument, so neither caller can reach into the
 * other's tree by accident.
 */

import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Delete every demo module's own folder under `src/modules/`.
 *
 * @param root - the checkout root
 * @param names - the module names to remove
 * @returns the folders deleted, relative to `root`
 */
export const removeModuleFolders = (root: string, names: readonly string[]): string[] =>
    names.map((name) => {
        const relative = path.join('src', 'modules', name);
        rmSync(path.join(root, relative), { recursive: true, force: true });
        return relative;
    });

/**
 * Rewrite a file by dropping the lines a predicate refuses.
 *
 * @param file - the file to edit in place
 * @param keep - whether a line stays
 */
const filterLines = (file: string, keep: (line: string) => boolean): void => {
    const lines = readFileSync(file, 'utf8').split('\n');
    writeFileSync(file, lines.filter((line) => keep(line)).join('\n'));
};

/**
 * Edit `src/modules.ts`: drop each demo module's import and its `enabledModules` array entry.
 * Every demo module name is a single word, so an import (`import cart from …`) and an array
 * element (`    cart,`) both spell it the same bare way — one filter catches both shapes.
 *
 * @param root - the checkout root
 * @param names - the module names to remove
 */
export const stripModuleRegistry = (root: string, names: readonly string[]): void => {
    const alternatives = names.join('|');
    const importPattern = new RegExp(`from '@/modules/(?:${alternatives})/module'`);
    const entryPattern = new RegExp(String.raw`^\s*(?:${alternatives}),?\s*$`);

    filterLines(
        path.join(root, 'src', 'modules.ts'),
        (line) => !importPattern.test(line) && !entryPattern.test(line)
    );
};

/**
 * Edit `scripts/module-edges.ts`: drop the entry of each removed module.
 *
 * Only the KEY goes. `assertAcyclicModuleEdges` refuses a key naming a module that is no longer
 * on disk, and lint dies on it; a removed name inside another module's VALUE list is harmless,
 * since a value is a backend module name that may have no folder here at all.
 *
 * @param root - the checkout root
 * @param names - the module names to remove
 */
export const pruneModuleEdges = (root: string, names: readonly string[]): void => {
    const entryPattern = new RegExp(String.raw`^\s{4}(?:${names.join('|')}):\s*\[.*],?\s*$`);

    filterLines(path.join(root, 'scripts', 'module-edges.ts'), (line) => !entryPattern.test(line));
};

/**
 * Delete `src/demo-modules.ts` and its spec — their whole job was naming modules that no longer
 * exist. `scripts/demo/demo-module-names.ts` stays: `measure-demo-strip.ts` still needs it for
 * whatever this build's module set becomes next.
 *
 * @param root - the checkout root
 * @returns the files deleted, relative to `root`
 */
export const removeManifest = (root: string): string[] => {
    const files = [
        path.join('src', 'demo-modules.ts'),
        path.join('tests', 'unit', 'demo-modules.spec.ts')
    ];
    for (const file of files) rmSync(path.join(root, file), { force: true });

    return files;
};
