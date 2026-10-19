#!/usr/bin/env tsx
/**
 * Fetches the baseline the nightly Lighthouse run proposed — `npm run test:lighthouse:pull`.
 *
 * Why:    the nightly holds no write access, so it uploads the proposed baseline as an artifact.
 * What:   writes it over `lighthouse-baseline.json`. Review the diff, then commit it as usual.
 * Needs:  the GitHub CLI, logged in (`gh auth login`).
 * See:    docs/tools/lighthouse.md#baseline-and-ratchet
 */
import { pullArtifact } from '../testing/pull-artifact';
import { LIGHTHOUSE_BASELINE_PATH } from './baseline';

/** The artifact `lighthouse.yml` uploads. */
const BASELINE_ARTIFACT = 'lighthouse-baseline';

// Exit 1 when no run has uploaded a baseline yet, or GitHub cannot be reached.
pullArtifact(
    {
        name: BASELINE_ARTIFACT,
        files: [{ inArtifact: 'lighthouse-baseline.json', target: LIGHTHOUSE_BASELINE_PATH }]
    },
    'lighthouse-pull'
)
    .then(() => {
        console.log('[lighthouse-pull] Review it with `git diff`, then commit it.');
    })
    .catch((error: unknown) => {
        console.error(
            `[lighthouse-pull] ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
    });
