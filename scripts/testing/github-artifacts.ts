/**
 * @module
 * Which uploaded artifact a `pull-*` script downloads: the newest unexpired one of a name, from a
 * run on `main`. Shared by the mutation report and the Lighthouse baseline.
 *
 * Pure: `pull-artifact.ts` does the GitHub calls and the file writes.
 * See: docs/tools/mutation-testing.md#the-nightly-holds-no-write-access
 */

/** The branch whose runs measure the code this checkout compares against. */
export const ARTIFACT_BRANCH = 'main';

/**
 * One artifact, as GitHub's "list artifacts for a repository" endpoint returns it — only the fields
 * read here.
 * https://docs.github.com/en/rest/actions/artifacts#list-artifacts-for-a-repository
 */
export interface GitHubArtifact {
    /** The artifact's name. */
    name: string;
    /** Past its retention: still listed, no longer downloadable. */
    expired: boolean;
    /** ISO-8601 upload time. */
    created_at: string;
    /** The run that uploaded it. */
    workflow_run: {
        /** The run's id — what `gh run download` takes. */
        id: number;
        /** The branch the run measured. */
        head_branch: string;
    };
}

/**
 * The newest artifact called `name` that a run on {@link ARTIFACT_BRANCH} uploaded and that can
 * still be downloaded.
 *
 * A run on another branch is skipped: it measured that branch's code, not `main`'s.
 *
 * @param artifacts - every artifact GitHub listed, in any order
 * @param name - the artifact to look for
 * @returns the one to download, or `undefined` when there is none
 */
export const newestArtifact = (
    artifacts: readonly GitHubArtifact[],
    name: string
): GitHubArtifact | undefined =>
    artifacts
        .filter(
            (artifact) =>
                artifact.name === name &&
                !artifact.expired &&
                artifact.workflow_run.head_branch === ARTIFACT_BRANCH
        )
        .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
        .at(0);
