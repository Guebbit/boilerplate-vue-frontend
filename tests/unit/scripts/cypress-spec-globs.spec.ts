/**
 * The five places that must agree about which Cypress specs exist.
 *
 * Three of them import `scripts/cypress-spec-globs.ts` and are true by construction. `package.json`
 * cannot import anything, so its five `--spec` arguments are checked here instead — by resolving
 * them against the real filesystem and comparing the file sets, not by comparing the strings.
 * Comparing strings would pass on two spellings that mean different things, which is the whole
 * failure being guarded: a one-level `tests/e2e` glob and its recursive form look alike and
 * schedule different suites the day a spec lands in a subdirectory.
 *
 * The direction that hurts is silent. Cypress INTERSECTS `--spec` with `specPattern`, so a spec
 * outside the pattern cannot run even when named — and a shallow glob simply schedules fewer
 * specs, with a green run to show for it.
 */

import { describe, expect, it } from 'vitest';
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import {
    ALL_SPEC_GLOBS,
    FUNCTIONAL_SPEC_GLOBS,
    VISUAL_SPEC_GLOBS
} from '../../../scripts/cypress-spec-globs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The files a comma-separated `--spec` argument, or a glob list, actually resolves to. */
const resolve = (globs: string[]): string[] =>
    globSync(globs, { cwd: REPO_ROOT })
        .map((entry) => entry.split(path.sep).join('/'))
        .toSorted();

const scripts = (): Record<string, string> =>
    JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).scripts;

/**
 * The `--spec` argument of an npm script, as the globs it names.
 *
 * `test:e2e:spec` wraps its default in `${E2E_SPEC:-...}`; the default is what is checked, since
 * the override is the caller's business.
 */
const specArgumentOf = (scriptName: string): string[] => {
    const command = scripts()[scriptName];
    const match = /--spec\s+["']?(?:\${E2E_SPEC:-)?([^"'}]+)/.exec(command);
    expect(match, `no --spec argument in ${scriptName}`).not.toBeNull();
    return match![1].split(',').map((glob) => glob.trim());
};

describe('every spelling of the spec set resolves to the same files', () => {
    it.each(['test:e2e:serial', 'test:e2e:live', 'test:e2e:spec'])(
        '%s runs exactly the functional suite',
        (scriptName) => {
            expect(resolve(specArgumentOf(scriptName))).toEqual(resolve(FUNCTIONAL_SPEC_GLOBS));
        }
    );

    it.each(['test:e2e:visual', 'test:e2e:visual:update'])(
        '%s runs exactly the visual suite',
        (scriptName) => {
            expect(resolve(specArgumentOf(scriptName))).toEqual(resolve(VISUAL_SPEC_GLOBS));
        }
    );

    /**
     * The two halves partition the whole. A spec in neither is a spec nothing runs, and a spec in
     * both would be photographed by the gate that exists not to photograph anything.
     */
    it('splits every spec into exactly one of the two suites', () => {
        const functional = resolve(FUNCTIONAL_SPEC_GLOBS);
        const visual = resolve(VISUAL_SPEC_GLOBS);

        expect(functional.filter((file) => visual.includes(file))).toEqual([]);
        expect([...functional, ...visual].toSorted()).toEqual(resolve(ALL_SPEC_GLOBS));
    });

    /** The guard on the guard: an empty set would satisfy every assertion above. */
    it('is checking a real suite', () => {
        expect(resolve(FUNCTIONAL_SPEC_GLOBS).length).toBeGreaterThan(20);
        expect(resolve(VISUAL_SPEC_GLOBS).length).toBeGreaterThan(5);
    });
});

/**
 * A config file's code lines, comments dropped.
 *
 * `cypress.config.ts` and `eslint.config.ts` are read as text rather than imported: importing
 * either pulls its whole plugin graph into jsdom, the same reason
 * `coverage-and-mutate-scope.spec.ts` reads `vitest.config.ts` as text. Comments go because all
 * three files discuss these paths in prose at length — and should. What must not survive is a
 * glob in the CODE.
 */
const codeLinesOf = (file: string): string[] =>
    readFileSync(path.join(REPO_ROOT, file), 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line));

describe('nothing spells the spec set by hand', () => {
    it.each(['cypress.config.ts', 'eslint.config.ts', 'scripts/run-e2e-shards.ts'])(
        '%s reads the constant instead of inlining a glob',
        (file) => {
            const lines = codeLinesOf(file);
            // A GLOB, not a mention: a `*` reaching a `.cy.ts`. `path.basename(file, '.cy.ts')`
            // is neither, and stripping an extension is not spelling the set.
            const inlined = lines.filter((line) => /\*[^\s"']*\.cy\.ts|{cy,spec}/.test(line));

            expect(inlined, `${file} inlines a spec glob`).toEqual([]);
            expect(lines.join('\n')).toMatch(/SPEC_GLOBS/);
        }
    );
});
