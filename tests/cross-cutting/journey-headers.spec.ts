/**
 * Every cross-module e2e spec says which modules it needs, so `npm run demo:remove` can delete it
 * with them.
 *
 * `tests/e2e/specs/journeys/` walks several modules at once, so no module folder owns its specs.
 * Without a `// requires-module: a, b` line (or `none`) a journey would survive the strip and then
 * fail on a module that is gone. The checker's own cases live in
 * `tests/unit/scripts/demo/demo-remove-tests.spec.ts`; this runs it on the real tree.
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { headerProblems } from '../../scripts/demo/demo-remove-tests';
import { MODULE_GROUPS } from '../../scripts/module-groups';

/** The repo root, two levels above this file. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('the requires-module headers of the e2e specs', () => {
    it('name only real modules, and every journey carries one', () => {
        expect(headerProblems(REPO_ROOT, Object.keys(MODULE_GROUPS))).toEqual([]);
    });
});
