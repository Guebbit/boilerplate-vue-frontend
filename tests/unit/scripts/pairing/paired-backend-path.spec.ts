/**
 * `scripts/pairing/paired-backend-path.ts` — where both halves of the pairing look for the other repo.
 *
 * One resolver serves two callers that fail in different ways: `cypress.config.ts` shells into the
 * result with `npm --prefix` for `cy.restore()`, and `check-spec-identity.ts` hashes files under
 * it. A wrong answer is a confusing npm error in the first and a false fork report in the second,
 * so what it does with a MISSING value matters more than what it does with a present one.
 *
 * The empty-string case is the one worth a test: `.env-example` declares `BACKEND_PATH =` with no
 * value, so every `.env` copied from it defines the variable as `''`. Resolved with `??` that
 * would be `path.resolve(cwd, '')` — this repo's own root, a directory that exists, so the sibling
 * check would compare the frontend against itself and report the backend's files as missing
 * instead of reporting that it could not find the backend.
 *
 * Mirrors `tests/unit/scripts/frontend-path.test.ts` in the backend.
 */
import { afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import {
    DEFAULT_BACKEND_PATH,
    resolveBackendDemoCommand,
    resolveBackendDemoShardLimit,
    resolveBackendPath,
    resolveLiveResetCommand,
    LIVE_SCENARIO_FILE
} from '../../../../scripts/pairing/paired-backend-path';

const previous = process.env.BACKEND_PATH;
const previousDemoCommand = process.env.BACKEND_DEMO_COMMAND;
const previousResetCommand = process.env.LIVE_RESET_COMMAND;
const previousShardLimit = process.env.BACKEND_DEMO_SHARD_LIMIT;

/** What the sibling-directory convention resolves to from this checkout. */
const sibling = path.resolve(process.cwd(), DEFAULT_BACKEND_PATH);

afterEach(() => {
    if (previous === undefined) delete process.env.BACKEND_PATH;
    else process.env.BACKEND_PATH = previous;

    if (previousDemoCommand === undefined) delete process.env.BACKEND_DEMO_COMMAND;
    else process.env.BACKEND_DEMO_COMMAND = previousDemoCommand;

    if (previousResetCommand === undefined) delete process.env.LIVE_RESET_COMMAND;
    else process.env.LIVE_RESET_COMMAND = previousResetCommand;

    if (previousShardLimit === undefined) delete process.env.BACKEND_DEMO_SHARD_LIMIT;
    else process.env.BACKEND_DEMO_SHARD_LIMIT = previousShardLimit;
});

describe('resolveBackendPath', () => {
    it('falls back to the sibling-directory convention when BACKEND_PATH is unset', () => {
        delete process.env.BACKEND_PATH;

        expect(resolveBackendPath()).toBe(sibling);
    });

    it('treats an empty BACKEND_PATH as unset, rather than as this repo', () => {
        process.env.BACKEND_PATH = '';

        expect(resolveBackendPath()).toBe(sibling);
        expect(resolveBackendPath()).not.toBe(process.cwd());
    });

    it('treats a whitespace-only BACKEND_PATH as unset too', () => {
        process.env.BACKEND_PATH = '   ';

        expect(resolveBackendPath()).toBe(sibling);
    });

    it('honours a relative override, resolved against the working directory', () => {
        process.env.BACKEND_PATH = '.spec-sibling';

        // The shape ci.yml uses, where the sibling is checked out into the workspace
        expect(resolveBackendPath()).toBe(path.resolve(process.cwd(), '.spec-sibling'));
    });

    it('returns an absolute override unchanged', () => {
        process.env.BACKEND_PATH = '/srv/checkouts/backend';

        expect(resolveBackendPath()).toBe('/srv/checkouts/backend');
    });

    it('always answers with an absolute path, whatever it was given', () => {
        for (const value of ['', '   ', 'relative/path', '/absolute/path']) {
            process.env.BACKEND_PATH = value;
            expect(path.isAbsolute(resolveBackendPath())).toBe(true);
        }
    });
});

/**
 * The two commands are the same shape of setting, and exist for the same reason: the PHP backend
 * exposes its reset and its demo profile through composer, which `npm --prefix` cannot reach.
 * Neither has a fallback — `.env-example` carries both spellings, and an unset variable means the
 * step is skipped rather than run against a backend nobody chose. The demo one answers with argv
 * rather than a string because the backend is spawned without a shell — one would swallow the
 * signal that stops it.
 */
describe('resolveLiveResetCommand', () => {
    it('answers undefined when LIVE_RESET_COMMAND is unset, so no reset is attempted', () => {
        delete process.env.LIVE_RESET_COMMAND;

        expect(resolveLiveResetCommand()).toBeUndefined();
    });

    it('treats an empty LIVE_RESET_COMMAND as unset', () => {
        process.env.LIVE_RESET_COMMAND = '   ';

        expect(resolveLiveResetCommand()).toBeUndefined();
    });

    it('substitutes {backend} into the value — the Node pairing `.env-example` ships', () => {
        process.env.LIVE_RESET_COMMAND = 'npm --prefix {backend} run host -- db:seed:reset';
        delete process.env.BACKEND_PATH;

        expect(resolveLiveResetCommand()).toBe(`npm --prefix ${sibling} run host -- db:seed:reset`);
    });

    it('substitutes {backend} into the PHP pairing too', () => {
        process.env.LIVE_RESET_COMMAND = 'composer --working-dir={backend} host -- db:seed:reset';
        process.env.BACKEND_PATH = '/srv/checkouts/php-backend';

        expect(resolveLiveResetCommand()).toBe(
            'composer --working-dir=/srv/checkouts/php-backend host -- db:seed:reset'
        );
    });

    // The live profile's only way to learn the seeded accounts and subject ids: a live deployment
    // mounts no `GET /__test/scenario`, so the reset writes the same JSON to a file instead.
    it('substitutes {describeTo} with the file the description is read back from', () => {
        process.env.LIVE_RESET_COMMAND = 'reset --describe-to={describeTo}';

        expect(resolveLiveResetCommand()).toBe(`reset --describe-to=${LIVE_SCENARIO_FILE}`);
    });
});

describe('resolveBackendDemoCommand', () => {
    it('answers undefined when BACKEND_DEMO_COMMAND is unset, so nothing is booted', () => {
        delete process.env.BACKEND_DEMO_COMMAND;

        expect(resolveBackendDemoCommand()).toBeUndefined();
    });

    it('treats an empty BACKEND_DEMO_COMMAND as unset', () => {
        process.env.BACKEND_DEMO_COMMAND = '   ';

        expect(resolveBackendDemoCommand()).toBeUndefined();
    });

    it('substitutes {backend} into the value — the Node pairing `.env-example` ships', () => {
        process.env.BACKEND_DEMO_COMMAND = 'npm --prefix {backend} run demo';
        delete process.env.BACKEND_PATH;

        expect(resolveBackendDemoCommand()).toEqual(['npm', '--prefix', sibling, 'run', 'demo']);
    });

    it('substitutes {backend} into the PHP pairing too', () => {
        process.env.BACKEND_DEMO_COMMAND = 'composer --working-dir={backend} demo';
        process.env.BACKEND_PATH = '/srv/checkouts/php-backend';

        expect(resolveBackendDemoCommand()).toEqual([
            'composer',
            '--working-dir=/srv/checkouts/php-backend',
            'demo'
        ]);
    });

    it('never answers with an empty argument, which spawn would reject', () => {
        process.env.BACKEND_DEMO_COMMAND = '  npm   --prefix {backend}   run  demo  ';

        expect(resolveBackendDemoCommand()?.every(Boolean)).toBe(true);
    });
});

describe('resolveBackendDemoShardLimit', () => {
    it('answers undefined when BACKEND_DEMO_SHARD_LIMIT is unset, so the pairing is unbounded', () => {
        delete process.env.BACKEND_DEMO_SHARD_LIMIT;

        expect(resolveBackendDemoShardLimit()).toBeUndefined();
    });

    it('treats the empty value `.env-example` ships as unset rather than as zero', () => {
        process.env.BACKEND_DEMO_SHARD_LIMIT = '   ';

        expect(resolveBackendDemoShardLimit()).toBeUndefined();
    });

    it('reads the provisioned count of a backend that has one — the PHP pairing', () => {
        process.env.BACKEND_DEMO_SHARD_LIMIT = '4';

        expect(resolveBackendDemoShardLimit()).toBe(4);
    });

    it('treats a non-numeric value as unset, so a typo cannot forbid every shard', () => {
        process.env.BACKEND_DEMO_SHARD_LIMIT = 'four';

        expect(resolveBackendDemoShardLimit()).toBeUndefined();
    });

    it('treats zero and negatives as unset, for the same reason', () => {
        process.env.BACKEND_DEMO_SHARD_LIMIT = '0';
        expect(resolveBackendDemoShardLimit()).toBeUndefined();

        process.env.BACKEND_DEMO_SHARD_LIMIT = '-2';
        expect(resolveBackendDemoShardLimit()).toBeUndefined();
    });

    it('treats a fractional value as unset — half a database is not provisioned', () => {
        process.env.BACKEND_DEMO_SHARD_LIMIT = '2.5';

        expect(resolveBackendDemoShardLimit()).toBeUndefined();
    });
});
