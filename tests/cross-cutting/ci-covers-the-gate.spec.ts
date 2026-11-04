/**
 * Guard: every check `npm run complete` runs has a CI job behind it.
 *
 * Fork of BE `tests/cross-cutting/ci-covers-the-gate.test.ts`, not kept in step.
 *
 * "What must pass" is defined twice: once as the `complete` chain the pre-commit hook runs, once
 * as the job list in `.github/workflows/`. Two definitions of one rule drift, and the drift that
 * matters is a check that reaches the local gate and no workflow, so a contributor using
 * `--no-verify`, or a PR from a fork, bypasses it with CI still green.
 *
 * Compared after EXPANDING the gate: `complete` is a chain of `npm run` calls, several of which
 * are chains themselves, so comparing the names as written would call `complete` covered because
 * CI happens to mention one of its members.
 *
 * One-directional on purpose. CI running more than the gate is right: `mutation.yml` and
 * `lighthouse.yml` are scheduled and deliberately absent from `complete`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** The repo root, two levels above this file. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The `scripts` table of `package.json`. */
const packageScripts = (): Record<string, string> =>
    (
        JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
            scripts: Record<string, string>;
        }
    ).scripts;

/**
 * Expands a script to the script NAMES it ultimately runs. A member that is itself an `npm run`
 * chain expands in turn; a member that runs a real command is a leaf, and is the unit CI has to name.
 *
 * @param script - the script name to expand
 * @param all - the `scripts` table
 * @param seen - names already expanded, so a cycle ends
 */
const expand = (
    script: string,
    all: Record<string, string>,
    seen = new Set<string>()
): string[] => {
    if (seen.has(script)) return [];
    seen.add(script);

    return (all[script] ?? '').split('&&').flatMap((step) => {
        const named = /^npm run ([\w:-]+)/.exec(step.trim());
        if (!named) return [];
        const child = named[1];
        const grandchildren = expand(child, all, seen);
        return grandchildren.length > 0 ? grandchildren : [child];
    });
};

/** Every non-comment line of every workflow, joined. A comment is not a job. */
const workflowText = (): string => {
    const directory = path.join(REPO_ROOT, '.github', 'workflows');
    return readdirSync(directory)
        .filter((file) => file.endsWith('.yml'))
        .flatMap((file) => readFileSync(path.join(directory, file), 'utf8').split('\n'))
        .filter((line) => !line.trimStart().startsWith('#'))
        .join('\n');
};

/** Every script name any workflow invokes, plus everything those names expand to. */
const scriptsRunByCi = (all: Record<string, string>, text: string): Set<string> => {
    const named = [...text.matchAll(/npm run ([\w:-]+)/g)].map(([, name]) => name);
    return new Set(named.flatMap((name) => [name, ...expand(name, all)]));
};

/**
 * Whether CI spells out every command of a leaf script itself.
 * `check` is six `tsx` calls; CI runs them as separate steps (`npx tsx ...`), never as `npm run check`.
 *
 * @param command - the leaf script's command line
 * @param text - the workflows' non-comment text
 */
const commandsSpelledOut = (command: string, text: string): boolean =>
    command
        .split('&&')
        .every((piece) => text.includes(piece.trim()) || text.includes(`npx ${piece.trim()}`));

/**
 * Gate members CI covers under other names, each with the reason. Every listed name must be covered.
 * An exception list is what this repo avoids, but the alternative is comparing arguments and
 * calling that semantic equality. An entry has to be argued in a diff.
 */
const COVERED_UNDER_OTHER_NAMES: Record<string, string[]> = {
    // `test:unit:ci` is the same vitest run with a JSON reporter added for the per-module rollup.
    'test:unit': ['test:unit:ci'],
    // `build` runs the two halves in parallel (`run-p`); CI gives each its own job.
    build: ['type-check-only', 'build-only']
};

describe('CI runs every check the local gate does', () => {
    it('leaves no member of `complete` without a job', () => {
        const all = packageScripts();
        const text = workflowText();
        const covered = scriptsRunByCi(all, text);

        const uncovered = expand('complete', all).filter(
            (member) =>
                !covered.has(member) &&
                !commandsSpelledOut(all[member] ?? member, text) &&
                !(
                    member in COVERED_UNDER_OTHER_NAMES &&
                    COVERED_UNDER_OTHER_NAMES[member].every((name) => covered.has(name))
                )
        );

        expect(uncovered).toEqual([]);
    });

    it('actually reads both sides', () => {
        // A canary: an empty result must mean "all covered", never "the file moved".
        const all = packageScripts();
        expect(expand('complete', all).length).toBeGreaterThan(5);
        expect(scriptsRunByCi(all, workflowText()).size).toBeGreaterThan(5);
    });
});
