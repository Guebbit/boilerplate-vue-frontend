/**
 * `scripts/git-base.ts` — the environment every nested `git` in a script runs under.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { gitEnvironment } from '../../../scripts/git-base';

describe('gitEnvironment', () => {
    /** The documented minimum: variables git reads that must never reach a nested call. */
    const SANDBOX = [
        'GIT_DIR',
        'GIT_WORK_TREE',
        'GIT_INDEX_FILE',
        'GIT_COMMON_DIR',
        'GIT_PREFIX',
        'GIT_AUTHOR_NAME',
        'GIT_AUTHOR_EMAIL',
        'GIT_COMMITTER_NAME',
        'GIT_COMMITTER_DATE',
        'GIT_CONFIG_PARAMETERS',
        'GIT_CONFIG_COUNT',
        'GIT_CONFIG_KEY_0',
        'GIT_CONFIG_VALUE_0'
    ];

    afterEach(() => {
        for (const name of [...SANDBOX, 'GIT_EXEC_PATH', 'KEEP_ME']) delete process.env[name];
    });

    it('drops the repository-local, identity and injected-config variables', () => {
        for (const name of SANDBOX) process.env[name] = 'x';
        const environment = gitEnvironment();
        expect(SANDBOX.filter((name) => name in environment)).toEqual([]);
    });

    it('drops any other GIT_* variable too, and keeps the rest', () => {
        process.env.GIT_EXEC_PATH = '/usr/lib/git-core';
        process.env.KEEP_ME = '1';
        const environment = gitEnvironment();
        expect(environment.GIT_EXEC_PATH).toBeUndefined();
        expect(environment.KEEP_ME).toBe('1');
    });
});
