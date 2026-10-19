#!/usr/bin/env tsx
/**
 * Brings the newest nightly run home — `npm run test:mutation:pull`.
 *
 * What:   the nightly's `mutation.json` and `index.html`, written where a local run writes them;
 *         then `mutation-baseline.json` recorded from that report, as the nightly records it.
 * Why:    the report is the one source. The baseline is derived from it, here as in CI, so the
 *         two can never disagree. Review the baseline's diff, then commit it.
 * Needs:  the GitHub CLI, logged in (`gh auth login`).
 * See:    docs/tools/mutation-testing.md#the-nightly-holds-no-write-access
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pullArtifact } from '../testing/pull-artifact';
import { MUTATION_REPORT_PATH } from './baseline';

/** The artifact the nightly uploads: its whole `reports/mutation/` folder. */
const REPORT_ARTIFACT = 'mutation-report';

/** Where a local run writes its report and page — the pulled ones go to the same place. */
const REPORT_DIRECTORY = path.dirname(MUTATION_REPORT_PATH);

/**
 * Records the pulled report into `mutation-baseline.json` — the command the nightly runs
 * (`test:mutation:baseline`).
 *
 * @returns the ratchet's exit code: 1 when the nightly measured a file below its baseline
 */
const recordBaseline = (): number =>
    spawnSync('npx', ['tsx', 'scripts/mutation/check-baseline.ts', '--update'], {
        stdio: 'inherit'
    }).status ?? 2;

// Exit 1 when no run has uploaded a report yet, or GitHub cannot be reached.
pullArtifact(
    {
        name: REPORT_ARTIFACT,
        files: ['mutation.json', 'index.html'].map((file) => ({
            inArtifact: file,
            target: path.join(REPORT_DIRECTORY, file)
        }))
    },
    'mutation-pull'
)
    .then(() => {
        process.exitCode = recordBaseline();
        console.log(
            '[mutation-pull] Review the baseline with `git diff mutation-baseline.json`, then commit it.'
        );
    })
    .catch((error: unknown) => {
        console.error(`[mutation-pull] ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    });
