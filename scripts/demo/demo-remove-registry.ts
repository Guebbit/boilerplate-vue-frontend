/**
 * @module
 * The registry edits a module removal makes, applied by `demo-remove.ts` to this checkout.
 *
 * Every function takes the checkout root as an argument, so a caller can never reach into a tree
 * it was not handed by accident.
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
 * The array entry is spelled with the import's variable name, which is the folder name
 * camel-cased for a hyphenated module (`stock-alerts` → `stockAlerts`), so it is read off the
 * import line rather than guessed from the folder.
 *
 * @param root - the checkout root
 * @param names - the module names to remove
 */
export const stripModuleRegistry = (root: string, names: readonly string[]): void => {
    const file = path.join(root, 'src', 'modules.ts');
    const importPattern = new RegExp(
        String.raw`^import\s+(\w+)\s+from\s+'@/modules/(?:${names.join('|')})/module'`
    );
    const variables = new Set(
        readFileSync(file, 'utf8')
            .split('\n')
            .map((line) => importPattern.exec(line)?.[1])
            .filter((variable): variable is string => variable !== undefined)
    );

    filterLines(
        file,
        (line) => !importPattern.test(line) && !variables.has(line.replaceAll(/^\s+|,?\s*$/g, ''))
    );
};
