/**
 * `scripts/testing/github-artifacts.ts` — which uploaded artifact a `pull-*` script takes.
 *
 * Driven against synthetic artifact lists, never GitHub: the download half
 * (`scripts/testing/pull-artifact.ts`) is a thin wrapper over the GitHub CLI.
 */
import { describe, expect, it } from 'vitest';
import type { GitHubArtifact } from '../../../../scripts/testing/github-artifacts';
import { newestArtifact } from '../../../../scripts/testing/github-artifacts';

/** The artifact name every case asks for. */
const REPORT_ARTIFACT = 'mutation-report';

/** `newestArtifact` for {@link REPORT_ARTIFACT}. */
const newestReport = (artifacts: readonly GitHubArtifact[]) =>
    newestArtifact(artifacts, REPORT_ARTIFACT);

/**
 * A report artifact uploaded by a run on `main`, with whatever the case changes.
 *
 * @param runId - the uploading run, which is also what tells the cases apart
 * @param createdAt - ISO-8601 upload time
 * @param overrides - the fields the case is about
 * @returns one artifact as GitHub lists it
 */
const artifact = (
    runId: number,
    createdAt: string,
    overrides: Partial<Omit<GitHubArtifact, 'workflow_run'>> & { branch?: string } = {}
): GitHubArtifact => ({
    name: overrides.name ?? REPORT_ARTIFACT,
    expired: overrides.expired ?? false,
    created_at: createdAt,
    workflow_run: { id: runId, head_branch: overrides.branch ?? 'main' }
});

describe('newestReport', () => {
    it('takes the newest upload, whatever order GitHub lists them in', () => {
        const chosen = newestReport([
            artifact(1, '2026-09-01T03:00:00Z'),
            artifact(3, '2026-11-01T03:00:00Z'),
            artifact(2, '2026-10-01T03:00:00Z')
        ]);

        expect(chosen?.workflow_run.id).toBe(3);
    });

    it('skips an artifact past its retention, which can no longer be downloaded', () => {
        const chosen = newestReport([
            artifact(1, '2026-09-01T03:00:00Z'),
            artifact(2, '2026-10-01T03:00:00Z', { expired: true })
        ]);

        expect(chosen?.workflow_run.id).toBe(1);
    });

    it('skips a run of another branch, whose scores belong to that branch’s code', () => {
        const chosen = newestReport([
            artifact(1, '2026-09-01T03:00:00Z'),
            artifact(2, '2026-10-01T03:00:00Z', { branch: 'feature' })
        ]);

        expect(chosen?.workflow_run.id).toBe(1);
    });

    it('skips an artifact with another name', () => {
        const chosen = newestReport([
            artifact(1, '2026-09-01T03:00:00Z'),
            artifact(2, '2026-10-01T03:00:00Z', { name: 'lighthouse-baseline' })
        ]);

        expect(chosen?.workflow_run.id).toBe(1);
    });

    it('answers nothing when no sweep has uploaded one yet', () => {
        expect(newestReport([])).toBeUndefined();
    });
});
