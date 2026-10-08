/**
 * The mutation scope still matches the code that exists.
 *
 * `stryker.config.json`'s `mutate` is the only place that decides which files are judged by the
 * mutation score, and a glob cannot report what it fails to match: a renamed directory just stops
 * being measured. This turns that into a red test instead of a quiet gap.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `process.cwd()` rather than a path derived from `import.meta.url`: under vitest this module is
 * served by Vite, so `import.meta.url` is not a `file:` url and cannot be resolved to a directory.
 */
const PROJECT_ROOT = process.cwd();

/** The raw `mutate` entries: positive globs, with `!` marking an exclusion. */
const mutatePatterns = (): string[] =>
    (
        JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'stryker.config.json'), 'utf8')) as {
            mutate: string[];
        }
    ).mutate;

/** Every file Stryker would mutate. */
const mutatedFiles = (): Set<string> => {
    const mutate = mutatePatterns();

    const include = mutate.filter((pattern) => !pattern.startsWith('!'));
    const exclude = mutate
        .filter((pattern) => pattern.startsWith('!'))
        .map((pattern) => pattern.slice(1));

    return new Set(globSync(include, { cwd: PROJECT_ROOT, exclude }));
};

describe('the Stryker mutation scope', () => {
    it('finds files to mutate', () => {
        // A canary: an empty sweep would make the assertion below pass over nothing.
        expect(mutatedFiles().size).toBeGreaterThan(0);
    });

    it('expands every include pattern to at least one real file', () => {
        // A pattern matching nothing silently stops measuring a directory that moved or was renamed.
        const empty = mutatePatterns()
            .filter((pattern) => !pattern.startsWith('!'))
            .filter((pattern) => globSync(pattern, { cwd: PROJECT_ROOT }).length === 0);

        expect(empty).toEqual([]);
    });
});
