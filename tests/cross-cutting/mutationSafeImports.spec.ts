/**
 * The guard nothing else provides: without it, the next unguarded import specifier is caught
 * only by a whole mutation run, and only as a dry-run failure naming a file that plainly exists.
 *
 * ── What breaks ──────────────────────────────────────────────────────────────────────────────────
 * Stryker's `StringLiteral` mutator has two halves, and only one of them knows about imports.
 * `string-literal-mutator.ts` refuses to mutate a plain string whose parent is an `import()` call —
 * so `import('./seeds.ts')` is safe and needs nothing. The template-literal half runs with no
 * parent check at all, and `import.meta.glob`'s argument is parented by a member expression rather
 * than by `import`, so neither is excluded:
 *
 *   import(`@/locales/${locale}.json`)   ->  import(``)        Vite cannot resolve it
 *   import.meta.glob('/src/locales/*')   ->  import.meta.glob('')   Rollup cannot parse it
 *
 * Vite must be able to read an import specifier statically, and Stryker's whole job is to make
 * literals non-static. The failure is not one surviving mutant: the instrumented build fails to
 * transform, so `npm run test:mutation` dies in the DRY RUN — before a single mutant is tested —
 * with `ERR_LOAD_URL` or `RollupError: Expected ',', got '<eof>'` naming a file that plainly exists.
 * That message points at the sandbox, not at the line, which is why this ran undiagnosed long
 * enough for the baseline to go stale.
 *
 * ── What this asserts ────────────────────────────────────────────────────────────────────────────
 * Every such specifier inside `stryker.config.json`'s `mutate` scope carries a `Stryker disable`
 * directive in the comment block directly above it. The scope is READ from the config rather than
 * repeated here, so widening `mutate` widens this sweep in the same commit.
 *
 * A directive is attached by Babel as a leading comment of the node it precedes, so a multi-line
 * explanation is fine as long as the block is contiguous and ends on the line before the code —
 * which is why this walks upwards through comment lines instead of looking only one line back.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `process.cwd()` rather than a path derived from `import.meta.url`: under vitest this module is
 * served by Vite, so `import.meta.url` is not a `file:` url and cannot be resolved to a directory.
 */
const PROJECT_ROOT = process.cwd();

/** `mutate` entries are positive globs; a `!` prefix marks an exclusion. */
const readMutateScope = (): string[] => {
    const { mutate } = JSON.parse(
        readFileSync(path.join(PROJECT_ROOT, 'stryker.config.json'), 'utf8')
    ) as { mutate: string[] };

    const include = mutate.filter((pattern) => !pattern.startsWith('!'));
    const exclude = mutate
        .filter((pattern) => pattern.startsWith('!'))
        .map((pattern) => pattern.slice(1));

    return globSync(include, { cwd: PROJECT_ROOT, exclude }).toSorted();
};

/**
 * The source with `//` comments blanked out, so a comment ABOUT one of these shapes — and the
 * explanations above every guarded import are full of them — is not read as one.
 *
 * Line count and column positions are preserved, so a match index still maps to its real line.
 */
const withoutLineComments = (source: string): string =>
    source
        .split('\n')
        .map((line) => {
            const comment = line.indexOf('//');
            return comment === -1
                ? line
                : line.slice(0, comment) + ' '.repeat(line.length - comment);
        })
        .join('\n');

/**
 * `import.meta.glob(...)`, and `import(...)` given a template literal — the second allowing for a
 * block-comment chunk-name hint before the backtick, and for the call being wrapped onto the line
 * below.
 */
const UNSAFE_SPECIFIERS = [
    { kind: 'import.meta.glob', pattern: /import\.meta\.glob\s*\(/g },
    { kind: 'dynamic import template', pattern: /\bimport\s*\(\s*(?:\/\*[\S\s]*?\*\/\s*)*`/g }
] as const;

interface Specifier {
    file: string;
    line: number;
    kind: string;
    guarded: boolean;
}

/** Whether a `Stryker disable` directive leads the code at `line` (1-based). */
const isGuarded = (lines: string[], line: number): boolean => {
    for (let above = line - 2; above >= 0; above--) {
        const text = lines[above]!.trim();
        // The block ends at the first line that is not a comment
        if (!text.startsWith('//') && !text.startsWith('*') && !text.startsWith('/*')) return false;
        if (/Stryker disable/.test(text)) return true;
    }
    return false;
};

const findSpecifiers = (file: string): Specifier[] => {
    const source = readFileSync(path.join(PROJECT_ROOT, file), 'utf8');
    const lines = source.split('\n');
    const code = withoutLineComments(source);

    return UNSAFE_SPECIFIERS.flatMap(({ kind, pattern }) =>
        [...code.matchAll(pattern)].map((match) => {
            const line = code.slice(0, match.index).split('\n').length;
            return { file, line, kind, guarded: isGuarded(lines, line) };
        })
    );
};

const mutateScope = readMutateScope();
const specifiers = mutateScope.flatMap((file) => findSpecifiers(file));

describe('import specifiers inside the mutate scope', () => {
    it('sweeps a scope that actually resolves to files', () => {
        // A `mutate` pattern that stops matching would make every assertion below vacuously true
        expect(mutateScope.length).toBeGreaterThan(0);
    });

    it('finds the specifiers it exists to check, so a broken matcher cannot pass silently', () => {
        expect(specifiers.length).toBeGreaterThan(0);
        expect(specifiers.some(({ kind }) => kind === 'import.meta.glob')).toBe(true);
        expect(specifiers.some(({ kind }) => kind === 'dynamic import template')).toBe(true);
    });

    it('guards every one of them with a Stryker directive', () => {
        const unguarded = specifiers
            .filter(({ guarded }) => !guarded)
            .map(({ file, line, kind }) => `${file}:${line} (${kind})`);

        // Listed rather than counted: the failure message has to name the line to fix, because the
        // run this protects reports a sandbox path and nothing else.
        expect(unguarded).toEqual([]);
    });
});
