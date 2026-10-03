/**
 * `scripts/e2e/antibot-backend.ts` — the one definition of the backend an antibot run boots.
 *
 * Three places boot it (the demo shard, `backend:demo --antibot`, the live workflow's matrix
 * entry), and the last one is YAML that cannot import the constant. So the workflow is read as text
 * and held equal to it.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    ANTIBOT_BACKEND_ENV,
    ANTIBOT_FLAG,
    wantsAntibotBackend
} from '../../../../scripts/e2e/antibot-backend';

/** The repo root, four levels above this file. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('ANTIBOT_BACKEND_ENV', () => {
    it('selects altcha with a secret and a cost low enough to solve in a spec', () => {
        expect(ANTIBOT_BACKEND_ENV.NODE_ANTIBOT_PROVIDER).toBe('altcha');
        // The backend requires a secret of its own when altcha is selected.
        expect(ANTIBOT_BACKEND_ENV.NODE_ANTIBOT_ALTCHA_SECRET).not.toBe('');
        // Its default is 100000.
        expect(Number(ANTIBOT_BACKEND_ENV.NODE_ANTIBOT_ALTCHA_COST)).toBeLessThan(100_000);
    });

    it('pins the per-account login budget small, so the login check is reachable', () => {
        // The check engages at half the budget: it must be a handful of wrong passwords away.
        expect(Number(ANTIBOT_BACKEND_ENV.NODE_AUTH_RATE_LIMIT_MAX)).toBeLessThanOrEqual(10);
    });

    it('is what the live workflow boots its antibot entry with', () => {
        const workflow = readFileSync(
            path.join(REPO_ROOT, '.github/workflows/e2e-live.yml'),
            'utf8'
        );

        // What follows `||` is what every other entry boots with, so only the left half is the constant's.
        const missing = Object.entries(ANTIBOT_BACKEND_ENV)
            .map(([name, value]) => `${name}: \${{ matrix.shard == 'antibot' && '${value}' || `)
            .filter((line) => !workflow.includes(line));

        expect(missing).toEqual([]);
    });
});

describe('wantsAntibotBackend', () => {
    it('reads the flag among other arguments, and its absence', () => {
        expect(wantsAntibotBackend([ANTIBOT_FLAG])).toBe(true);
        expect(wantsAntibotBackend(['--other', ANTIBOT_FLAG])).toBe(true);
        expect(wantsAntibotBackend([])).toBe(false);
        expect(wantsAntibotBackend(['--other'])).toBe(false);
    });
});
