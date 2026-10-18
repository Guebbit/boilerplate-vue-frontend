#!/usr/bin/env tsx
/**
 * Fetches the newest baseline the nightly mutation run uploaded — `npm run test:mutation:pull`.
 *
 * Why:    the nightly holds no write access to the repository, so it cannot commit the baseline;
 *         it uploads it as an artifact instead, and this brings it home.
 * What:   writes it over `mutation-baseline.json`. Review the diff, then commit it as usual.
 * Needs:  the GitHub CLI, logged in (`gh auth login`).
 * See:    docs/tools/mutation-testing.md#the-nightly-holds-no-write-access
 */
import { pullArtifact } from '../testing/pull-artifact';
import { MUTATION_BASELINE_PATH } from './baseline';

/** The artifact the nightly uploads: the updated `mutation-baseline.json`. */
const BASELINE_ARTIFACT = 'mutation-baseline';

// Exit 1 when no run has uploaded a baseline yet, or GitHub cannot be reached.
pullArtifact(
    {
        name: BASELINE_ARTIFACT,
        fileInArtifact: MUTATION_BASELINE_PATH,
        targetPath: MUTATION_BASELINE_PATH
    },
    'mutation-pull'
).catch((error: unknown) => {
    console.error(`[mutation-pull] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
