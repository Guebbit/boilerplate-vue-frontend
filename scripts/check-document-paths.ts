#!/usr/bin/env tsx
/**
 * Fails when a doc names a source file that does not exist — `npm run check:doc-paths`.
 *
 * Docs in this repo cite paths constantly, and a path is the one part of a sentence that stops
 * being true without anyone editing it. A reorganisation moves the file, every prose reference to
 * it silently becomes a dead end, and nothing reports it: the build passes, the tests pass, and
 * the reader is the one who finds out. Fifteen of them had accumulated across two reorgs before
 * anyone looked.
 *
 * ── WHY IT RESOLVES AGAINST THE BACKEND TOO ──────────────────────────────────────────────────
 * Roughly half the paths in these docs deliberately name files in the PAIRED BACKEND — the rules
 * a mock mirrors, the test helpers this repo has no equivalent of. A checker that only knew about
 * this repo would flag every one of them, and a gate that cries wolf is a gate somebody turns off
 * within a week.
 *
 * So a path counts as resolved if it exists HERE or THERE, and no new prose syntax is needed to
 * tell them apart. The cost is a real one and worth stating: a frontend path that also happens to
 * exist in the backend passes even when this repo's copy has moved. Both repos are laid out the
 * same way deliberately, so that overlap is largest exactly where it matters. It is accepted
 * because the alternative — annotating every cross-repo reference by hand — is the kind of
 * bookkeeping that rots faster than the thing it documents.
 *
 * ── WHY A MISSING SIBLING IS NOT FATAL LOCALLY, AND IS IN CI ─────────────────────────────────
 * Same rule as `check-spec-identity.ts`, for the same reason: a half-cloned pair should still be
 * able to commit. Without the backend on disk every cross-repo path would report as broken, so
 * the check runs in THIS-REPO-ONLY mode and says so, rather than producing a list that is mostly
 * noise. Under `CI` a missing sibling is a misconfigured workflow, so it fails instead.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_BACKEND_PATH, resolveBackendPath } from './backendPath';

/**
 * Backtick spans that look like a repo path: a known top-level directory, then a filename with an
 * extension. The extension is what keeps `src/modules/` and other bare directory mentions out —
 * those are prose about a layout, not a reference to one file.
 */
const PATH_PATTERN = /`((?:src|tests|scripts|contracts|cypress|db)\/[\w./-]+\.[a-z]+)`/g;

/**
 * A line may opt out with `<!-- doc-paths:ignore -->`, and exactly one thing earns it: prose that
 * names a path deliberately because it no longer exists — a "was here, is now there" table, or a
 * paragraph explaining what an arrangement replaced. Those references are correct BECAUSE the file
 * is missing, so a checker that resolved them would be asking the docs to lie.
 *
 * It is not an escape hatch for a path that merely fails. A reference that should resolve and does
 * not is the bug this exists to find, and silencing it here hides exactly that.
 */
const IGNORE_MARKER = '<!-- doc-paths:ignore -->';

/**
 * Paths carrying a glob or a `<placeholder>` name a SHAPE rather than a file — `tests/**` or
 * `src/modules/<name>/factory.ts`. There is nothing to resolve, and resolving the literal text
 * would report every one of them.
 */
const isTemplate = (candidate: string) => /[*<>[\]]/.test(candidate);

const backendRoot = resolveBackendPath();
const hasBackend = existsSync(backendRoot);

if (!hasBackend) {
    const message =
        `\n[check-document-paths] No backend checkout at ${backendRoot}.\n` +
        `  Clone it beside this repo as ${DEFAULT_BACKEND_PATH}, or set BACKEND_PATH in .env.\n`;
    if (process.env.CI) {
        console.error(
            `${message}  CI is set, so this is a misconfigured workflow rather than a\n` +
                `  developer with half the pair on disk.\n`
        );
        process.exit(2);
    }
    console.warn(`${message}  Cross-repo paths will be reported as broken — skipping them.\n`);
}

const files = [...globSync('docs/**/*.md'), 'README.md'].toSorted();
const broken: { file: string; line: number; target: string }[] = [];
let checked = 0;
/** Paths absent here that no sibling was on disk to vouch for — counted, never reported. */
let unverifiable = 0;

for (const file of files)
    for (const [index, text] of readFileSync(file, 'utf8').split('\n').entries()) {
        if (text.includes(IGNORE_MARKER)) continue;
        for (const [, target] of text.matchAll(PATH_PATTERN)) {
            if (isTemplate(target)) continue;
            checked++;
            if (existsSync(target)) continue;
            // With no sibling on disk a cross-repo reference and a genuinely dead path are
            // indistinguishable, so report NEITHER. Claiming a path is broken because half the
            // pair is missing is the false alarm that gets a gate switched off.
            if (!hasBackend) {
                unverifiable++;
                continue;
            }
            if (existsSync(path.join(backendRoot, target))) continue;
            broken.push({ file, line: index + 1, target });
        }
    }

if (broken.length === 0) {
    console.log(
        `[check-document-paths] ${checked} path(s) across ${files.length} file(s) all resolve` +
            (hasBackend
                ? ' here or in the backend.'
                : ` in this repo; ${unverifiable} needed the backend and were not checked.`)
    );
    process.exit(0);
}

console.error(
    `\n[check-document-paths] ${broken.length} of ${checked} documented path(s) do not exist:\n\n` +
        broken.map(({ file, line, target }) => `  ${file}:${line}\n    ${target}`).join('\n') +
        `\n\n  Either the file moved and the doc did not follow, or the path names a shape rather\n` +
        `  than a file — in which case write it with a \`<placeholder>\` or a glob so it reads as\n` +
        `  one, and this check will leave it alone. A path that is missing ON PURPOSE —\n` +
        `  prose about what something used to be — takes ${IGNORE_MARKER} on its line.\n`
);
process.exit(1);
