/**
 * @module
 * Brings the newest baseline a nightly uploaded home: the GitHub half of the `pull-baseline`
 * scripts. The nightlies hold no write access, so they upload the updated baseline as an artifact
 * instead of committing it.
 *
 * Needs the GitHub CLI, logged in (`gh auth login`).
 * See: docs/tools/mutation-testing.md#the-nightly-holds-no-write-access
 */
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { newestArtifact, type GitHubArtifact } from './github-artifacts';

/** `execFile`, promise-shaped: arguments are passed as a list, never through a shell. */
const run = promisify(execFile);

/**
 * GitHub CLI: list this repository's artifacts by name. `{owner}/{repo}` is filled in by `gh` from
 * the current checkout's remote. 100 is the endpoint's page maximum — months of nightly runs.
 * https://cli.github.com/manual/gh_api
 */
const listArtifacts = (name: string): Promise<GitHubArtifact[]> =>
    run('gh', ['api', `repos/{owner}/{repo}/actions/artifacts?name=${name}&per_page=100`]).then(
        ({ stdout }) => (JSON.parse(stdout) as { artifacts: GitHubArtifact[] }).artifacts
    );

/**
 * GitHub CLI: download one named artifact of one run, unzipped into `directory`.
 * https://cli.github.com/manual/gh_run_download
 */
const download = (runId: number, name: string, directory: string): Promise<unknown> =>
    run('gh', ['run', 'download', String(runId), '--name', name, '--dir', directory]);

/**
 * Downloads the newest unexpired `name` artifact of a run on `main` and copies one file out of it.
 *
 * @param artifact - what to fetch
 * @param artifact.name - the artifact's name
 * @param artifact.fileInArtifact - the file inside the unzipped artifact
 * @param artifact.targetPath - where to write it, relative to the repo root
 * @param log - the tag the message is printed under, e.g. `mutation-pull`
 * @throws when no run on `main` has uploaded one, or GitHub cannot be reached
 */
export const pullArtifact = (
    artifact: { name: string; fileInArtifact: string; targetPath: string },
    log: string
): Promise<void> =>
    listArtifacts(artifact.name).then((artifacts) => {
        const chosen = newestArtifact(artifacts, artifact.name);
        if (!chosen) throw new Error(`no unexpired ${artifact.name} artifact from a run on main`);
        return mkdtemp(path.join(tmpdir(), `${artifact.name}-`)).then((directory) =>
            download(chosen.workflow_run.id, artifact.name, directory)
                .then(() =>
                    copyFile(path.join(directory, artifact.fileInArtifact), artifact.targetPath)
                )
                .finally(() => rm(directory, { recursive: true, force: true }))
                .then(() => {
                    console.log(
                        `[${log}] ${artifact.targetPath} ← run ${String(chosen.workflow_run.id)} ` +
                            `(${chosen.created_at}). Review it with \`git diff\`, then commit it.`
                    );
                })
        );
    });
