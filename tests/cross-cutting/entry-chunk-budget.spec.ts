/**
 * The entry chunk stays small enough that a first load does not pay for the whole app — FA94.
 *
 * Runs a real production build (`vite build`, into a scratch output directory so it never
 * collides with a developer's own `dist/`) and inspects what actually ships: `index.html`'s
 * `<script>` names the one JS file every visitor downloads before anything else runs, unlike a
 * lazy route or module chunk that only loads when visited.
 *
 * ── Why a budget, and why this number ────────────────────────────────────────────────────────
 * Before FA94, `@api/schemas` (the generated Zod contract, ~1,700 schemas) was imported at module
 * scope from every domain's `response-schemas.ts`, so it rode into the entry chunk whether or not
 * a build ever validated a response with it. Measured on this branch before the fix: 767 KB raw /
 * 171 KB gzip. After moving the schemas behind a lazy `import()` (`main.ts`, gated on
 * `shouldValidateResponses()`) and stripping their generated `.describe()` calls
 * (`scripts/contracts/strip-schema-descriptions.ts`): 407 KB raw / 132 KB gzip.
 *
 * The budget below is 460 KB raw — headroom over the current, measured size for ordinary feature
 * growth, but far under the pre-fix number, so a schema import (or an equally large dependency)
 * finding its way back into the entry graph fails this test instead of shipping silently.
 *
 * ── Why gzip is reported but not budgeted ────────────────────────────────────────────────────
 * Raw size is what the parser and minifier actually worked over, and is what a static import
 * regression changes; gzip ratio varies with what else the build interleaves and would make the
 * budget noisier without adding a check this test doesn't already make some other way.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Raw bytes the entry chunk must stay under — see the module docblock for how this was chosen. */
const ENTRY_CHUNK_BUDGET_BYTES = 460 * 1024;

/** The repo root — this file lives two levels under it. */
const ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * The entry script's `/assets/<file>.js` path, exactly as `index.html` references it — the one
 * script tag `type="module"` marks, since that is what a browser executes on load rather than on
 * a later navigation.
 */
const entryScriptPath = (html: string): string => {
    const match = /<script type="module"[^>]*\ssrc="([^"]+)"/.exec(html);
    if (!match)
        throw new Error('index.html has no module entry script — build output changed shape');
    return match[1];
};

describe('entry chunk budget', () => {
    let buildOutputDirectory: string;
    let html: string;

    // One production build serves every assertion below — `vite build`'s own cost (a handful of
    // seconds) is why this is a `beforeAll`, not a `beforeEach`.
    beforeAll(() => {
        buildOutputDirectory = mkdtempSync(path.join(tmpdir(), 'entry-chunk-budget-'));
        // The locally-installed `vite` binary directly, not `npx vite`: this runs inside the
        // unit-test suite, so it must not depend on npm resolving or fetching anything.
        // `vite build --outDir <dir>`: https://vite.dev/guide/cli.html#build
        execFileSync(
            path.join(ROOT, 'node_modules', '.bin', 'vite'),
            ['build', '--outDir', buildOutputDirectory],
            { cwd: ROOT, stdio: 'ignore' }
        );
        html = readFileSync(path.join(buildOutputDirectory, 'index.html'), 'utf8');
    }, 120_000);

    afterAll(() => {
        rmSync(buildOutputDirectory, { recursive: true, force: true });
    });

    it('stays under the raw-byte budget', () => {
        const entryPath = path.join(buildOutputDirectory, entryScriptPath(html));
        const { size } = statSync(entryPath);

        // Byte counts in the failure message: the budget and the regression are both easier to
        // read as KB than as a bare byte count.
        expect(size, `entry chunk grew to ${(size / 1024).toFixed(1)} KB`).toBeLessThanOrEqual(
            ENTRY_CHUNK_BUDGET_BYTES
        );
    });

    it('does not eagerly load the response-schema contract chunk', () => {
        // The schema chunk is real (Rollup names it after its source, `schemas.zod.ts`) — this
        // fails closed if the split silently stops happening, not just if it stays but loads early.
        const schemaChunk = readdirSync(path.join(buildOutputDirectory, 'assets')).find((file) =>
            /^schemas\.zod-.*\.js$/.test(file)
        );
        expect(schemaChunk, 'no schemas.zod-*.js chunk in the build output').toBeDefined();

        // `<script>` and `<link rel="modulepreload">` are what the browser fetches before or at
        // parse time; a dynamic `import()` elsewhere in the entry chunk's SOURCE is fine — that's
        // the lazy load itself — so this checks the HTML shell, not the entry chunk's text.
        expect(html).not.toContain(schemaChunk);
    });
});
