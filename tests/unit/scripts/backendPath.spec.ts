/**
 * `scripts/backend-path.ts` — where both halves of the pairing look for the other repo.
 *
 * One resolver serves two callers that fail in different ways: `cypress.config.ts` shells into the
 * result with `npm --prefix` for `cy.resetState()`, and `check-spec-identity.ts` hashes files under
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
import { DEFAULT_BACKEND_PATH, resolveBackendPath } from '../../../scripts/backend-path';

const previous = process.env.BACKEND_PATH;

/** What the sibling-directory convention resolves to from this checkout. */
const sibling = path.resolve(process.cwd(), DEFAULT_BACKEND_PATH);

afterEach(() => {
    if (previous === undefined) delete process.env.BACKEND_PATH;
    else process.env.BACKEND_PATH = previous;
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
