/**
 * `docker/docker-entrypoint.d/41-generate-security-txt.sh` — off by default, and RFC 9116's two
 * required fields gate publication.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The entrypoint script under test. */
const script = path.resolve(
    __dirname,
    '../../../docker/docker-entrypoint.d/41-generate-security-txt.sh'
);

/** The throwaway web root each case writes into. */
let root = '';

/**
 * Runs the script against the scratch root with exactly the given variables.
 */
const run = (environment: Record<string, string>): void => {
    const { status } = spawnSync('sh', [script], {
        env: { PATH: process.env.PATH ?? '', SECURITY_TXT_ROOT: root, ...environment }
    });
    expect(status).toBe(0);
};

/** Where the script writes `security.txt`, under the current web root. */
const target = (): string => path.join(root, '.well-known', 'security.txt');

beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'security-txt-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('41-generate-security-txt.sh', () => {
    it('publishes nothing when unconfigured', () => {
        run({});

        expect(existsSync(target())).toBe(false);
    });

    it('publishes nothing with a contact but no Expires', () => {
        run({ VITE_SECURITY_CONTACT: 'mailto:a@b.c' });

        expect(existsSync(target())).toBe(false);
    });

    it('writes Contact, Expires and language, and Policy only when set', () => {
        run({
            VITE_SECURITY_CONTACT: 'mailto:a@b.c',
            VITE_SECURITY_EXPIRES: '2027-01-01T00:00:00Z'
        });

        expect(readFileSync(target(), 'utf8')).toBe(
            'Contact: mailto:a@b.c\nExpires: 2027-01-01T00:00:00Z\nPreferred-Languages: en\n'
        );

        run({
            VITE_SECURITY_CONTACT: 'mailto:a@b.c',
            VITE_SECURITY_EXPIRES: '2027-01-01T00:00:00Z',
            VITE_SECURITY_POLICY_URL: 'https://x.test/SECURITY.md'
        });

        expect(readFileSync(target(), 'utf8')).toContain('Policy: https://x.test/SECURITY.md\n');
    });

    it('removes a stale file when the configuration is withdrawn', () => {
        run({
            VITE_SECURITY_CONTACT: 'mailto:a@b.c',
            VITE_SECURITY_EXPIRES: '2027-01-01T00:00:00Z'
        });
        run({});

        expect(existsSync(target())).toBe(false);
    });

    it('cannot be made to inject a header line through a newline in a value', () => {
        run({
            VITE_SECURITY_CONTACT: 'mailto:a@b.c\nExpires: 1999-01-01',
            VITE_SECURITY_EXPIRES: '2027-01-01T00:00:00Z'
        });

        expect(
            readFileSync(target(), 'utf8')
                .split('\n')
                .filter((l) => l.startsWith('Expires'))
        ).toHaveLength(1);
    });
});
