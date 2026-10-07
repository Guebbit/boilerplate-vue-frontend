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
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { MUTATION_BASELINE_PATH } from './baseline';
import type { GitHubArtifact } from './github-artifacts';
import { BASELINE_ARTIFACT, newestBaseline } from './github-artifacts';

/** `execFile`, promise-shaped: arguments are passed as a list, never through a shell. */
const run = promisify(execFile);

/**
 * GitHub CLI: list this repository's artifacts by name. `{owner}/{repo}` is filled in by `gh` from
 * the current checkout's remote. 100 is the endpoint's page maximum — over three months of nightly runs.
 * https://cli.github.com/manual/gh_api
 */
const listArtifacts = (): Promise<GitHubArtifact[]> =>
    run('gh', [
        'api',
        `repos/{owner}/{repo}/actions/artifacts?name=${BASELINE_ARTIFACT}&per_page=100`
    ]).then(({ stdout }) => (JSON.parse(stdout) as { artifacts: GitHubArtifact[] }).artifacts);

/**
 * GitHub CLI: download one named artifact of one run, unzipped into `directory`.
 * https://cli.github.com/manual/gh_run_download
 */
const download = (runId: number, directory: string): Promise<unknown> =>
    run('gh', ['run', 'download', String(runId), '--name', BASELINE_ARTIFACT, '--dir', directory]);

/**
 * Downloads `artifact` into a scratch directory, copies the baseline out, and removes the scratch.
 *
 * @param artifact - the artifact {@link newestBaseline} chose
 */
const install = (artifact: GitHubArtifact): Promise<void> =>
    mkdtemp(path.join(tmpdir(), 'mutation-baseline-')).then((directory) =>
        download(artifact.workflow_run.id, directory)
            .then(() =>
                copyFile(path.join(directory, MUTATION_BASELINE_PATH), MUTATION_BASELINE_PATH)
            )
            .finally(() => rm(directory, { recursive: true, force: true }))
            .then(() => {
                console.log(
                    `[mutation-pull] ${MUTATION_BASELINE_PATH} ← run ${String(artifact.workflow_run.id)} ` +
                        `(${artifact.created_at}). Review it with \`git diff\`, then commit it.`
                );
            })
    );

// Exit 1 when no run has uploaded a baseline yet, or GitHub cannot be reached.
listArtifacts()
    .then((artifacts) => {
        const artifact = newestBaseline(artifacts);
        if (!artifact)
            throw new Error(`no unexpired ${BASELINE_ARTIFACT} artifact from a run on main`);
        return install(artifact);
    })
    .catch((error: unknown) => {
        console.error(`[mutation-pull] ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    });
