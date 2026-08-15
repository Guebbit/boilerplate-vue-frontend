/**
 * Coverage floors and the mutation scope, held to the relationship they are supposed to have.
 *
 * The two instruments answer different questions — `vitest.config.ts` asks "is this file executed
 * by a test at all", `stryker.config.json` asks "would a test notice if it were broken" — and they
 * deliberately do not cover the same list. `mutate` is the wider of the two, because a file with no
 * coverage is free to mutate and expensive to floor.
 *
 * "Wider" is the part worth enforcing, and it was previously asserted only in a comment. The
 * failure this catches is a floored file that nothing mutates: the floor says the file is executed,
 * and then nothing asks whether executing it proves anything. That is precisely the gap mutation
 * testing exists to close, so a file important enough to floor is important enough to mutate.
 *
 * The reverse is NOT asserted, and must not be. `mutate` intentionally holds far more than the
 * floored set, including files with no coverage at all; requiring a floor for everything mutated
 * would turn every honest zero into a failing gate, which is the opposite of what the zero is for.
 *
 * ── Why the thresholds are read as text ──────────────────────────────────────────────────────────
 * `stryker.config.json` is JSON and is parsed. `vitest.config.ts` is a module, and importing it
 * here pulls Vite and esbuild into the test environment, which fails outright under jsdom
 * (`TextEncoder ... instanceof Uint8Array is incorrectly false`) and cannot be run under `node`
 * either, because `tests/support/unit/setup.ts` patches `HTMLElement`. So the threshold keys are
 * lifted from the source with a brace-matched scan of the `thresholds` block.
 *
 * That is fragile in one specific way — a reformat could hide a key — so it is not left to fail
 * silently: the two canaries below assert the scan found globs at all and that every glob it found
 * expands to a real file. A scan that quietly matched nothing fails there rather than passing the
 * real assertion vacuously.
 */
import { globSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `process.cwd()` rather than a path derived from `import.meta.url`: under vitest this module is
 * served by Vite, so `import.meta.url` is not a `file:` url and cannot be resolved to a directory.
 */
const PROJECT_ROOT = process.cwd();

/** Every file Stryker would mutate. `mutate` entries are positive globs; `!` marks an exclusion. */
const mutatedFiles = (): Set<string> => {
    const { mutate } = JSON.parse(
        readFileSync(path.join(PROJECT_ROOT, 'stryker.config.json'), 'utf8')
    ) as { mutate: string[] };

    const include = mutate.filter((pattern) => !pattern.startsWith('!'));
    const exclude = mutate
        .filter((pattern) => pattern.startsWith('!'))
        .map((pattern) => pattern.slice(1));

    return new Set(globSync(include, { cwd: PROJECT_ROOT, exclude }));
};

/** The body of the `thresholds: { … }` object literal, found by matching braces. */
const thresholdsBlock = (source: string): string => {
    const start = source.indexOf('thresholds: {');
    if (start === -1) return '';

    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        else if (source[index] === '}') {
            depth -= 1;
            if (depth === 0) return source.slice(start, index);
        }
    }
    return '';
};

/**
 * The glob keys under `coverage.thresholds`.
 *
 * A threshold key is a glob only when it is a quoted string opening an object — which is what
 * separates `'src/modules/*` + `/store.ts': {` from the bare `perFile: true` sharing the block.
 */
const flooredGlobs = (): string[] => {
    const source = readFileSync(path.join(PROJECT_ROOT, 'vitest.config.ts'), 'utf8');
    return [...thresholdsBlock(source).matchAll(/'([^']+)':\s*{/g)].map((match) => match[1]);
};

/**
 * The files a glob matches, directories dropped.
 *
 * `src/infrastructure/http/**` matches the directory itself as well as what is inside it, and a
 * directory is not something Stryker mutates — leaving it in reports the folder as an unmutated
 * floored "file", which is noise rather than a finding.
 */
const filesMatching = (glob: string): string[] =>
    globSync(glob, { cwd: PROJECT_ROOT }).filter((entry) =>
        statSync(path.join(PROJECT_ROOT, entry)).isFile()
    );

describe('every file with a coverage floor is also mutated', () => {
    it('finds both lists', () => {
        // A canary: an empty sweep on either side would make the assertion below pass over
        // nothing, which is the failure a config-reading test is most prone to.
        expect(mutatedFiles().size).toBeGreaterThan(0);
        expect(flooredGlobs().length).toBeGreaterThan(0);
    });

    it('expands every floored glob to at least one real file', () => {
        // A threshold key matching nothing is a floor that silently guards no file. It also guards
        // this spec: a glob `globSync` cannot expand would otherwise read as "nothing floored
        // here" and pass the real assertion below for the wrong reason.
        const empty = flooredGlobs().filter((glob) => filesMatching(glob).length === 0);

        expect(empty).toEqual([]);
    });

    it('leaves no floored file outside the mutation scope', () => {
        const mutated = mutatedFiles();
        const unmutated = flooredGlobs().flatMap((glob) =>
            filesMatching(glob)
                .filter((file) => !mutated.has(file))
                .map((file) => `${file} has a coverage floor (${glob}) but is not mutated`)
        );

        expect(unmutated).toEqual([]);
    });
});
