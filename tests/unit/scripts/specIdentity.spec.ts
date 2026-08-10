/**
 * `scripts/specIdentity.ts` — the cross-repo contract check.
 *
 * Two separate things are worth testing here, and only one of them is the comparison logic:
 *
 *  1. **The logic**, against fixtures on a temp directory. It has to work when the sibling
 *     checkout is absent, which is the state of every CI runner that has not checked it out and
 *     of every copy of this boilerplate cloned on its own — so it is driven against synthetic
 *     roots rather than the real neighbouring repo. A test that needed the sibling present would
 *     be the one thing that cannot run where the check matters most.
 *
 *  2. **The real pair**, when the sibling actually is beside this checkout. That case is
 *     conditional on purpose: it is the live assertion that the two repos agree today, and it is
 *     the only one that would notice a fork introduced by hand. Where the sibling is missing it
 *     reports as skipped rather than passing quietly, because a check that silently evaporates is
 *     worse than one that is visibly absent.
 *
 * Mirrors `tests/unit/scripts/spec-identity.test.ts` in the backend.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    SHARED_SPEC_FILES,
    compareSpecs,
    formatSpecProblems,
    hashFile,
    specProblems
} from '../../../scripts/specIdentity';
import { resolveBackendPath } from '../../../scripts/backendPath';

const roots: string[] = [];

/** Builds a throwaway repo root holding the named files with the given contents. */
const root = (files: Record<string, string>): string => {
    const created = mkdtempSync(path.join(tmpdir(), 'spec-identity-'));
    for (const [name, contents] of Object.entries(files)) {
        mkdirSync(path.dirname(path.join(created, name)), { recursive: true });
        writeFileSync(path.join(created, name), contents);
    }
    roots.push(created);
    return created;
};

const allSpecs = (): Record<string, string> =>
    Object.fromEntries(SHARED_SPEC_FILES.map((file) => [file, `${file} contents`]));

/**
 * `allSpecs()` with one file replaced.
 *
 * A helper rather than an inline object literal because the keys are filenames — `openapi.yaml`
 * is not an identifier, and writing it as a literal key trips the naming-convention lint rule in
 * every fixture. Building the record from `SHARED_SPEC_FILES` also means a fourth shared file
 * joins these fixtures automatically.
 */
const specsWith = (file: string, contents: string): Record<string, string> => ({
    ...allSpecs(),
    [file]: contents
});

/** A repo root holding only the named files. */
const onlySpecs = (...files: string[]): Record<string, string> =>
    Object.fromEntries(files.map((file) => [file, `${file} contents`]));

const [OPENAPI, ASYNCAPI, SPECTRAL] = SHARED_SPEC_FILES;

afterAll(() => {
    for (const created of roots) rmSync(created, { recursive: true, force: true });
});

describe('compareSpecs', () => {
    it('reports every shared file as matching when the two copies are identical', () => {
        const comparisons = compareSpecs(root(allSpecs()), root(allSpecs()));

        expect(comparisons).toHaveLength(SHARED_SPEC_FILES.length);
        expect(comparisons.every(({ status }) => status === 'match')).toBe(true);
        expect(specProblems(comparisons)).toEqual([]);
    });

    it('reports a one-byte difference as a fork', () => {
        // The whole point: a spec that still parses, still lints, and no longer agrees.
        const here = root(allSpecs());
        const there = root(specsWith(OPENAPI, `${OPENAPI} contents `));

        const drifted = compareSpecs(there, here).filter(({ status }) => status === 'drift');

        expect(drifted.map(({ file }) => file)).toEqual([OPENAPI]);
        expect(drifted[0]?.ours).not.toBe(drifted[0]?.theirs);
    });

    it('names spectral.yaml too, not only the two specs', () => {
        // The ruleset is as shared as the documents it lints — see the note in specIdentity.ts.
        const here = root(allSpecs());
        const there = root(specsWith(SPECTRAL, 'different rules'));

        expect(specProblems(compareSpecs(there, here)).map(({ file }) => file)).toEqual([SPECTRAL]);
    });

    it('distinguishes a missing sibling checkout from a forked contract', () => {
        // Every file `missing-there` is what an unchecked-out sibling looks like, and it wants a
        // different message from "your specs disagree". Reported, never thrown.
        const comparisons = compareSpecs(root({}), root(allSpecs()));

        expect(comparisons.every(({ status }) => status === 'missing-there')).toBe(true);
        expect(comparisons.every(({ theirs }) => theirs === undefined)).toBe(true);
    });

    it('reports a file deleted on this side', () => {
        const here = root(onlySpecs(OPENAPI, ASYNCAPI));

        expect(
            compareSpecs(root(allSpecs()), here).find(({ file }) => file === SPECTRAL)?.status
        ).toBe('missing-here');
    });

    it('does not throw when neither side has anything', () => {
        expect(() => compareSpecs(root({}), root({}))).not.toThrow();
    });
});

describe('hashFile', () => {
    it('gives identical contents the same digest and different contents a different one', () => {
        const a = root(onlySpecs(OPENAPI));
        const b = root(onlySpecs(OPENAPI));
        const c = root(specsWith(OPENAPI, 'other'));

        expect(hashFile(path.join(a, OPENAPI))).toBe(hashFile(path.join(b, OPENAPI)));
        expect(hashFile(path.join(a, OPENAPI))).not.toBe(hashFile(path.join(c, OPENAPI)));
    });
});

describe('formatSpecProblems', () => {
    it('says nothing when there is nothing wrong', () => {
        const there = root(allSpecs());

        expect(formatSpecProblems(compareSpecs(there, root(allSpecs())), there)).toBe('');
    });

    it('names the forked file and both digests', () => {
        const here = root(allSpecs());
        const there = root(specsWith(ASYNCAPI, 'forked'));

        const message = formatSpecProblems(compareSpecs(there, here), there);

        expect(message).toContain(ASYNCAPI);
        expect(message).toContain('FORKED');
        // Both digests, so the message can be pasted into an issue and mean something later.
        expect(message).toContain(hashFile(path.join(here, ASYNCAPI)));
        expect(message).toContain(hashFile(path.join(there, ASYNCAPI)));
    });

    it('tells the reader what to do about it', () => {
        const here = root(allSpecs());
        const there = root(specsWith(OPENAPI, 'forked'));

        expect(formatSpecProblems(compareSpecs(there, here), there)).toContain('npm run genapi');
    });
});

/*
 * The live pair. Conditional, and loud about being conditional — see the file header.
 */
const siblingRoot = resolveBackendPath();
const describeIfSibling = existsSync(siblingRoot) ? describe : describe.skip;

describeIfSibling(`the paired backend at ${siblingRoot}`, () => {
    it('carries byte-identical copies of every shared contract file', () => {
        expect(formatSpecProblems(compareSpecs(siblingRoot), siblingRoot)).toBe('');
    });
});
