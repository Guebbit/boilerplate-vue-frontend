/**
 * The first-paint JavaScript stays small enough that a first load does not pay for the whole app.
 *
 * Runs a real production build (`vite build`, into a scratch output directory so it never
 * collides with a developer's own `dist/`) and inspects what actually ships: `index.html`'s
 * `<script>` and `<link rel="modulepreload">` tags name the JS set every visitor downloads before
 * anything else runs (the entry plus the chunks it statically imports), unlike a lazy route or
 * module chunk that only loads when visited.
 *
 * ── Why a budget, and why this number ────────────────────────────────────────────────────────
 * Before the schemas loaded lazily, `@api/schemas` (the generated Zod contract, ~1,700 schemas)
 * was imported at module scope from every domain's `response-schemas.ts`, so it rode into the
 * entry chunk whether or not a build ever validated a response with it. Measured on this branch
 * before the fix: 767 KB raw / 171 KB gzip. After moving the schemas behind a lazy `import()`
 * (`main.ts`, gated on `shouldValidateResponses()`) and stripping their generated `.describe()`
 * calls (`scripts/contracts/strip-schema-descriptions.ts`): 407 KB raw / 132 KB gzip.
 *
 * The build is forced to NODE_ENV=production: Vitest sets `test`, and a dev build both inflates
 * the first paint and hides production-only imports. A zod value import in `validate.ts`
 * (reached only when `isReportOnly()`) once took the real entry to 512 KB unseen. The first-paint
 * set (entry plus modulepreloads) now measures ~602 KB raw.
 *
 * The budget below (see `ENTRY_CHUNK_BUDGET_BYTES`) counts the entry PLUS the modulepreloads,
 * since the bundler may move shared code between the two. It is far under the pre-fix number, so
 * a schema import (or an equally large dependency) finding its way back into the first paint
 * fails this test instead of shipping silently.
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

/**
 * Raw bytes the first paint's JavaScript must stay under: the entry script plus every
 * `<link rel="modulepreload">` in `index.html`. Measured 602 KB on Vite 8 (584 KB on Vite 7, where
 * the shared modules were folded into the entry); 700 KB leaves growth headroom, far under what a
 * schema or a page-sized dependency costs.
 */
const ENTRY_CHUNK_BUDGET_BYTES = 700 * 1024;

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

/**
 * Every JS file `index.html` makes the browser fetch before the app runs: the module entry and the
 * modulepreloads. The bundler decides how much of the shared code lands in the entry itself and
 * how much in preloaded chunks, so the entry file alone cannot show a regression.
 */
const firstPaintScripts = (html: string): string[] => [
    entryScriptPath(html),
    ...[...html.matchAll(/<link rel="modulepreload"[^>]*\shref="([^"]+)"/g)].map(
        (match) => match[1]
    )
];

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
            // Vitest sets NODE_ENV=test, which would make this a DEV build (devtools, dev builds
            // of vue-router and vue-i18n) and hide what `isReportOnly()` pulls in under PROD.
            { cwd: ROOT, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } }
        );
        html = readFileSync(path.join(buildOutputDirectory, 'index.html'), 'utf8');
    }, 120_000);

    afterAll(() => {
        rmSync(buildOutputDirectory, { recursive: true, force: true });
    });

    it('keeps the first-paint scripts under the raw-byte budget', () => {
        const size = firstPaintScripts(html).reduce(
            (sum, script) => sum + statSync(path.join(buildOutputDirectory, script)).size,
            0
        );

        // Byte counts in the failure message: the budget and the regression are both easier to
        // read as KB than as a bare byte count.
        expect(size, `first-paint JS grew to ${(size / 1024).toFixed(1)} KB`).toBeLessThanOrEqual(
            ENTRY_CHUNK_BUDGET_BYTES
        );
    });

    it('does not eagerly load the response-schema contract chunk', () => {
        // The schema chunk is real (the bundler names it after its source, `contracts/rest/schemas.zod.ts`) — this
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
