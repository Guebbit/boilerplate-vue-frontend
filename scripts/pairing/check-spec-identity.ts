#!/usr/bin/env tsx
/**
 * CLI for the cross-repo contract check — `npm run check:spec-identity`.
 *
 * Wired into `ci.yml` (which checks out the sibling repo first and passes `BACKEND_PATH`), into
 * `npm run complete`, and available on its own.
 *
 * ── WHERE THE SIBLING PATH COMES FROM ────────────────────────────────────────────────────────────
 * `resolveBackendPath()` — the shell's `BACKEND_PATH`, then `.env`'s, then the sibling-directory
 * convention `paired-backend-path.ts` documents. It reads `.env` itself, since `npm run` does not.
 *
 * ── EXIT CODES ARE THE INTERFACE ─────────────────────────────────────────────────────────────────
 *   0  the contracts are identical — or the sibling is absent and this is a developer's machine
 *   1  they have forked, or a shared file is missing on one side
 *   2  the sibling checkout could not be found, and we are somewhere that should have one
 *
 * `2` is separated from `1` because it is an environment problem rather than a contract problem: a
 * copy of this boilerplate cloned on its own should say "I cannot see the other repo", not "your
 * specs have drifted".
 *
 * ── WHY A MISSING SIBLING IS NOT FATAL LOCALLY, AND IS IN CI ─────────────────────────────────────
 * This check is part of `npm run complete`, which is the pre-commit gate. Hard-failing there would
 * make the gate unusable for anyone who cloned one half of the pair, so a missing sibling prints
 * what to do and exits 0.
 *
 * That leniency is exactly how a check quietly stops running, which is why it is switched off in
 * CI: `CI` is set by GitHub Actions (and by every other runner), and there a missing sibling means
 * the workflow is misconfigured — `ci.yml` checks the repo out itself before calling this. So the
 * one place where "no sibling" could hide a real fork is the one place it stays fatal.
 */
import { existsSync } from 'node:fs';
import { DEFAULT_BACKEND_PATH, resolveBackendPath } from './paired-backend-path';
import {
    compareSharedFiles,
    formatSharedFileProblems,
    SHARED_FILES,
    THIS_REPO
} from './spec-identity';

/** The backend checkout to compare against: the shell's `BACKEND_PATH`, `.env`'s, or the default. */
const siblingRoot = resolveBackendPath();

// No sibling checkout: skipped locally, fatal under CI.
if (!existsSync(siblingRoot)) {
    const message =
        `\n[spec-identity] No checkout found at ${siblingRoot}.\n` +
        `  This check compares ${SHARED_FILES.length} shared files against the paired backend.\n` +
        `  Clone it beside this repo as ${DEFAULT_BACKEND_PATH}, or set BACKEND_PATH in .env.\n`;

    if (process.env.CI) {
        console.error(
            `${message}  CI is set, so this is a misconfigured workflow rather than a\n` +
                `  half-cloned pair: ci.yml checks the sibling out itself and passes BACKEND_PATH.\n`
        );
        process.exit(2);
    }

    console.warn(`${message}  SKIPPED — the shared contract files were not compared.\n`);
    process.exit(0);
}

/** Each shared file compared against its sibling counterpart. */
const comparisons = compareSharedFiles(siblingRoot);

/** The failure report, or nothing when every file matches. */
const problems = formatSharedFileProblems(comparisons, siblingRoot);

// Any mismatch fails the check.
if (problems) {
    console.error(`\n[spec-identity] ${problems}\n`);
    process.exit(1);
}

console.log(
    `[spec-identity] ${SHARED_FILES.length} shared files identical to ${siblingRoot} (as ${THIS_REPO}).`
);
