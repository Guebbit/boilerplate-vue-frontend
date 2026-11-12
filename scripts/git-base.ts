/**
 * @module
 * Helpers shared by every script that runs a nested `git`.
 */

/**
 * `process.env` minus every `GIT_*` variable. A sandboxed nested `git` needs none of the outer
 * ones: a hook's `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` (git's own `--local-env-vars` list)
 * override `cwd` and aim it at the hook's own repo, `GIT_AUTHOR_*`/`GIT_COMMITTER_*` change the
 * identity, and `GIT_CONFIG_*` inject settings. The same function lives in the BE's
 * `scripts/git-base.ts`.
 * https://git-scm.com/docs/git-rev-parse#Documentation/git-rev-parse.txt---local-env-vars
 *
 * @returns the cleaned environment
 */
export const gitEnvironment = (): NodeJS.ProcessEnv =>
    Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
