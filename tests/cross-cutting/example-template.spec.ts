/**
 * The `example` module's docs table (`docs/theory/modules.md#the-module-template`) names real
 * files, and no module keeps a status transition table on the client.
 *
 * The server lists the moves a caller may make (the `actions` flags); a client table is a second
 * copy that drifts.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repo root. */
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The template module's folder. */
const EXAMPLE_ROOT = path.join(ROOT, 'src/modules/example');

/**
 * Every non-test `.ts` / `.vue` file under a folder, relative to it.
 *
 * @param directory - The folder to walk.
 * @param prefix - The path walked so far.
 * @returns The relative paths.
 */
const sourceFiles = (directory: string, prefix = ''): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const relative = path.posix.join(prefix, entry.name);
        if (entry.isDirectory())
            return entry.name === 'tests'
                ? []
                : sourceFiles(path.join(directory, entry.name), relative);
        return /\.(?:ts|vue)$/.test(entry.name) ? [relative] : [];
    });

describe('the example docs table names real files', () => {
    it('lists only files and folders that exist', () => {
        const documentation = readFileSync(path.join(ROOT, 'docs/theory/modules.md'), 'utf8');
        const section = documentation.slice(documentation.indexOf('## The module template'));
        const named = [
            ...section.matchAll(/`((?:views|components|composables|domain)\/[\w./-]+)`/g)
        ].map((match) => match[1]);
        const existing = new Set(sourceFiles(EXAMPLE_ROOT));

        expect(named.filter((file) => !existing.has(file))).toEqual([]);
    });
});

describe('no module keeps a status transition table on the client', () => {
    const modules = readdirSync(path.join(ROOT, 'src/modules'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

    it.each(modules)('%s/domain holds none', (name) => {
        const domain = path.join(ROOT, 'src/modules', name, 'domain');
        let files: string[] = [];
        try {
            files = sourceFiles(domain);
        } catch {
            // No `domain/` folder: nothing to hold a table.
        }
        const offenders = files.filter((file) => {
            const source = readFileSync(path.join(domain, file), 'utf8');
            // The `Record<XStatus, …>` shape is refused by lint (the `src/modules/*/domain` block
            // in `eslint.config.ts`); the export NAME is what a regex can still see.
            return /export const (?:NEXT_STATUSES|TRANSITIONS)\b/.test(source);
        });

        expect(offenders).toEqual([]);
    });
});
