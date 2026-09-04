/**
 * `scripts/pairing/spec-identity.ts` — the cross-repo contract check.
 *
 * Three separate things are worth testing here, and only one of them is the comparison logic:
 *
 *  1. **The logic**, against fixtures on a temp directory. It has to work when the sibling
 *     checkout is absent, which is the state of every CI runner that has not checked it out and
 *     of every copy of this boilerplate cloned on its own — so it is driven against synthetic
 *     roots rather than the real neighbouring repo. A test that needed the sibling present would
 *     be the one thing that cannot run where the check matters most.
 *
 *  2. **The YAML fingerprint**, unique to this repo's copy of the module: two different
 *     serialisations of the same document have to agree. Neither backend's own copy of this file
 *     needs it, since each one only ever compares itself against the one frontend, written by the
 *     same dumper.
 *
 *  3. **The real pair**, when the sibling actually is beside this checkout. That case is
 *     conditional on purpose: it is the live assertion that the two repos agree today, and it is
 *     the only one that would notice a fork introduced by hand. Where the sibling is missing it
 *     reports as skipped rather than passing quietly, because a check that silently evaporates is
 *     worse than one that is visibly absent.
 *
 * The fixtures are built from `SHARED_FILES` rather than from a hardcoded list, so a file added
 * to the check is covered by every case below without touching this file — and, more to the
 * point, cannot be added *without* being covered.
 *
 * Mirrors `tests/unit/scripts/pairing/spec-identity.test.ts` in the backend, apart from section 2.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    SHARED_FILES,
    THIS_REPO,
    siblingRole,
    compareSharedFiles,
    formatSharedFileProblems,
    hashFile,
    fingerprint,
    sharedFileProblems,
    type RepoRole
} from '../../../../scripts/pairing/spec-identity';
import { resolveBackendPath } from '../../../../scripts/pairing/paired-backend-path';

/** Builds a throwaway repo root holding the named files with the given contents. */
const makeRoot = (files: Record<string, string>): string => {
    const root = mkdtempSync(path.join(tmpdir(), 'spec-identity-'));
    for (const [name, contents] of Object.entries(files)) {
        mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
        writeFileSync(path.join(root, name), contents);
    }
    return root;
};

/**
 * Every shared file as one side spells it, with contents keyed by the pair's *index*.
 *
 * Indexed rather than named because the two sides do not agree on names: the seed identities live
 * at different paths, so contents keyed by path would differ between the repos and every pair
 * would read as forked. What must match is the content, not the filename.
 */
const sharedFiles = (role: RepoRole, suffix = ''): Record<string, string> =>
    Object.fromEntries(
        SHARED_FILES.map((shared, index) => [
            role === 'backend' ? shared.backend : shared.frontend,
            `shared-${index} contents${suffix}`
        ])
    );

/**
 * The two contract files, as named constants, spelled the way THIS repo spells them.
 *
 * Declared rather than written inline because a filename is not an identifier: `'openapi.yaml'` as
 * a literal object key trips the naming-convention lint rule in every fixture, while a computed
 * key built from a variable does not. `sharedFilesWith` and `withoutFile` exist for the same
 * reason — they are the only two shapes a fixture needs.
 */
const OPENAPI = 'openapi.yaml';
const ASYNCAPI = 'asyncapi.yaml';

/** `sharedFiles(role)` with one entry replaced. */
const sharedFilesWith = (
    role: RepoRole,
    file: string,
    contents: string
): Record<string, string> => ({ ...sharedFiles(role), [file]: contents });

/** `sharedFiles(role)` with one entry removed. */
const withoutFile = (role: RepoRole, file: string): Record<string, string> => {
    const files = sharedFiles(role);
    delete files[file];
    return files;
};

const HERE: RepoRole = 'frontend';
const THERE: RepoRole = 'backend';

/** A pair whose paths differ between the repos — the case a same-path check could not express. */
const CROSS_PATH = SHARED_FILES.find(({ backend, frontend }) => backend !== frontend)!;

const roots: string[] = [];
const root = (files: Record<string, string>) => {
    const created = makeRoot(files);
    roots.push(created);
    return created;
};

afterAll(() => {
    for (const created of roots) rmSync(created, { recursive: true, force: true });
});

describe('SHARED_FILES', () => {
    it('names this repo as the frontend', () => {
        // The one value that differs from the backend's copy of the module. If it were wrong,
        // every cross-path pair would be compared against the wrong filename and report missing.
        expect(THIS_REPO).toBe('frontend');
        expect(siblingRole(THIS_REPO)).toBe('backend');
    });

    it('covers both halves of the contract', () => {
        const frontendPaths = new Set(SHARED_FILES.map(({ frontend }) => frontend));

        expect(frontendPaths).toContain(OPENAPI);
        expect(frontendPaths).toContain(ASYNCAPI);
        // And nothing else. Two files, both produced in the backend, which is what makes a fork
        // answerable at all — `spectral.yaml` and the three shared scripts are gone, along with
        // the Node backend's own copy of them.
        expect(frontendPaths.size).toBe(2);
    });

    it('excludes anything this repo regenerates from a file already in the list', () => {
        const frontendPaths = new Set(SHARED_FILES.map(({ frontend }) => frontend));

        expect(frontendPaths).not.toContain('src/types/asyncapi.generated.ts');
    });

    it('holds at least one pair whose paths differ between the repos', () => {
        expect(CROSS_PATH).toBeDefined();
    });

    it('lists no file twice on either side', () => {
        const frontendPaths = SHARED_FILES.map(({ frontend }) => frontend);

        expect(new Set(frontendPaths).size).toBe(frontendPaths.length);
    });
});

describe('compareSharedFiles', () => {
    it('reports every shared file as matching when the two copies are identical', () => {
        // Note the two roots are built with DIFFERENT path sets — backend spelling here, frontend
        // spelling there — which is the whole point of the pair structure.
        const here = root(sharedFiles(HERE));
        const there = root(sharedFiles(THERE));

        const comparisons = compareSharedFiles(there, here, HERE);

        expect(comparisons).toHaveLength(SHARED_FILES.length);
        expect(comparisons.every(({ status }) => status === 'match')).toBe(true);
        expect(sharedFileProblems(comparisons)).toEqual([]);
    });

    it('matches a cross-path pair across its two different names', () => {
        const here = root(sharedFiles(HERE));
        const there = root(sharedFiles(THERE));

        const comparison = compareSharedFiles(there, here, HERE).find(
            ({ file }) => file === CROSS_PATH.frontend
        );

        expect(comparison?.status).toBe('match');
        expect(comparison?.siblingFile).toBe(CROSS_PATH.backend);
    });

    it('reports a cross-path pair as forked when only one side changed', () => {
        // The bug these pairs exist to catch: a contract edited in one repo only. Both suites stay
        // green — each is consistent with its own copy — and only this notices.
        const here = root(sharedFiles(HERE));
        const there = root({
            ...sharedFiles(THERE),
            [CROSS_PATH.backend]: 'edited on one side only'
        });

        const drifted = compareSharedFiles(there, here, HERE).filter(
            ({ status }) => status === 'drift'
        );

        expect(drifted.map(({ file }) => file)).toEqual([CROSS_PATH.frontend]);
    });

    it('distinguishes a missing sibling checkout from a forked contract', () => {
        // Every file `missing-there` is what an unchecked-out sibling looks like, and it wants a
        // different message from "your specs disagree". Reported, never thrown.
        const here = root(sharedFiles(HERE));
        const there = root({});

        const comparisons = compareSharedFiles(there, here, HERE);

        expect(comparisons.every(({ status }) => status === 'missing-there')).toBe(true);
        expect(comparisons.every(({ theirs }) => theirs === undefined)).toBe(true);
    });

    it('reports a file deleted on this side', () => {
        const here = root(withoutFile(HERE, OPENAPI));
        const there = root(sharedFiles(THERE));

        const comparisons = compareSharedFiles(there, here, HERE);

        expect(comparisons.find(({ file }) => file === OPENAPI)?.status).toBe('missing-here');
    });

    it('does not throw when neither side has anything', () => {
        expect(() => compareSharedFiles(root({}), root({}), HERE)).not.toThrow();
    });
});

describe('fingerprint', () => {
    it('gives a non-YAML file the same digest as hashFile', () => {
        const directory = root({ 'notes.txt': 'const x = 1;\n' });
        const file = path.join(directory, 'notes.txt');

        expect(fingerprint(file)).toBe(hashFile(file));
    });

    it('agrees on two YAML documents that mean the same thing but are quoted differently', () => {
        // The real case this exists for: the PHP backend's `symfony/yaml` quotes what redocly
        // leaves bare. A raw byte hash would call a real sync forked on formatting alone.
        const a = root({ 'openapi.yaml': 'title: Demo API\nversion: 2.0.0\n' });
        const b = root({ 'openapi.yaml': "title: 'Demo API'\nversion: '2.0.0'\n" });

        expect(fingerprint(path.join(a, 'openapi.yaml'))).toBe(
            fingerprint(path.join(b, 'openapi.yaml'))
        );
    });

    it('agrees on two YAML documents whose maps are keyed in a different order', () => {
        const a = root({ 'openapi.yaml': 'a: 1\nb: 2\n' });
        const b = root({ 'openapi.yaml': 'b: 2\na: 1\n' });

        expect(fingerprint(path.join(a, 'openapi.yaml'))).toBe(
            fingerprint(path.join(b, 'openapi.yaml'))
        );
    });

    it('agrees on two YAML documents whose only difference is a trailing newline in a block scalar', () => {
        // `|` keeps the block scalar's trailing newline, `|-` strips it — a dumper's chomping
        // choice, not content. The real case: BE(php)'s `info.description` carried one, BEold's
        // did not, for text that was otherwise identical.
        const a = root({ 'openapi.yaml': 'description: |\n  one line\n' });
        const b = root({ 'openapi.yaml': 'description: |-\n  one line\n' });

        expect(fingerprint(path.join(a, 'openapi.yaml'))).toBe(
            fingerprint(path.join(b, 'openapi.yaml'))
        );
    });

    it('still disagrees on two YAML documents with different content', () => {
        const a = root({ 'openapi.yaml': 'title: Demo API\n' });
        const b = root({ 'openapi.yaml': 'title: Other API\n' });

        expect(fingerprint(path.join(a, 'openapi.yaml'))).not.toBe(
            fingerprint(path.join(b, 'openapi.yaml'))
        );
    });

    it('does not reorder a LIST the way it reorders a MAP', () => {
        // `security`, `enum` and a path's `parameters` all mean something by their position, so a
        // blanket sort would call two different documents identical.
        const a = root({ 'openapi.yaml': 'enum: [a, b]\n' });
        const b = root({ 'openapi.yaml': 'enum: [b, a]\n' });

        expect(fingerprint(path.join(a, 'openapi.yaml'))).not.toBe(
            fingerprint(path.join(b, 'openapi.yaml'))
        );
    });
});

describe('hashFile', () => {
    it('gives identical contents the same digest and different contents a different one', () => {
        const a = root({ [OPENAPI]: 'same' });
        const b = root({ [OPENAPI]: 'same' });
        const c = root({ [OPENAPI]: 'other' });

        expect(hashFile(path.join(a, OPENAPI))).toBe(hashFile(path.join(b, OPENAPI)));
        expect(hashFile(path.join(a, OPENAPI))).not.toBe(hashFile(path.join(c, OPENAPI)));
    });
});

describe('formatSharedFileProblems', () => {
    it('says nothing when there is nothing wrong', () => {
        const here = root(sharedFiles(HERE));
        const there = root(sharedFiles(THERE));

        expect(formatSharedFileProblems(compareSharedFiles(there, here, HERE), there)).toBe('');
    });

    it('names the forked file and both fingerprints', () => {
        // A same-path pair, so one constant names the file in both roots. The cross-path case has
        // its own test below.
        const here = root(sharedFiles(HERE));
        const there = root(sharedFilesWith(THERE, OPENAPI, 'forked'));

        const message = formatSharedFileProblems(compareSharedFiles(there, here, HERE), there);

        expect(message).toContain(OPENAPI);
        expect(message).toContain('FORKED');
        // Both fingerprints, so the message can be pasted into an issue and mean something later.
        expect(message).toContain(fingerprint(path.join(here, OPENAPI)));
        expect(message).toContain(fingerprint(path.join(there, OPENAPI)));
    });

    it('names both paths when a cross-path pair forks', () => {
        const here = root(sharedFiles(HERE));
        const there = root({ ...sharedFiles(THERE), [CROSS_PATH.backend]: 'forked' });

        const message = formatSharedFileProblems(compareSharedFiles(there, here, HERE), there);

        expect(message).toContain(CROSS_PATH.backend);
        expect(message).toContain(CROSS_PATH.frontend);
    });

    it('tells the reader what to do about it', () => {
        const here = root(sharedFiles(HERE));
        const there = root(sharedFilesWith(THERE, OPENAPI, 'forked'));
        const message = formatSharedFileProblems(compareSharedFiles(there, here, HERE), there);

        expect(message).toContain('npm run gen:api');
        // Every entry is assembled from per-module fragments in the backend, so "copy whichever
        // side is right" is the wrong instruction: the fix is to re-bundle there and copy the
        // result here. A message that omitted that invites an edit to this repo's copy that the
        // next `contracts:bundle` silently reverts.
        expect(message).toContain('contracts:bundle');
        expect(message).toContain('npm run gen:asyncapi');
    });
});

/*
 * The live pair.
 *
 * Conditional on the sibling being checked out, because a clone with only this repo is a normal
 * way to work — but NOT silently. A skipped suite reads as green, and the one guard that would
 * have caught a forked contract is exactly the guard nobody notices going missing.
 *
 * So the absence is asserted rather than assumed: locally it says so out loud, and under `CI` it
 * fails, because a pipeline that checks out one half of a pair and reports success on the shared
 * contract is reporting something it did not check.
 *
 * `resolveBackendPath()` reads `BACKEND_PATH` off `process.env`, and nothing in the Vitest runner
 * loads `.env` into it the way `check-spec-identity.ts`'s CLI does for itself — so this loads it
 * the same guarded way, or a `.env` pointed at the PHP backend would still get checked against the
 * Node one here.
 */
try {
    process.loadEnvFile();
} catch {
    /* no .env in this checkout */
}

const siblingRoot = resolveBackendPath();
const siblingPresent = existsSync(siblingRoot);

describe(`the paired backend at ${siblingRoot}`, () => {
    it('is checked out, or this suite is knowingly incomplete', () => {
        if (siblingPresent) return;

        const message = `Shared-contract checks skipped: no sibling repo at ${siblingRoot}.`;
        // eslint-disable-next-line no-console -- the skip warning must reach a terminal that has no logger configured
        if (!process.env.CI) console.warn(`⚠️  ${message}`);
        expect(process.env.CI ? message : '').toBe('');
    });

    it('carries identical copies of every shared file', () => {
        // Nothing to compare without the sibling. The test above is what makes that visible —
        // and what fails in CI — so this one simply has no work to do.
        if (!siblingPresent) return;

        const comparisons = compareSharedFiles(siblingRoot);

        expect(formatSharedFileProblems(comparisons, siblingRoot)).toBe('');
    });
});
