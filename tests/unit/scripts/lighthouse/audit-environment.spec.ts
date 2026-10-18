/**
 * `scripts/lighthouse/audit-environment.ts`: every URL the audit build bakes is loopback, and the
 * generators it runs are the container's own.
 */
import { describe, it, expect } from 'vitest';
import {
    auditEnvironment,
    generatorScripts
} from '../../../../scripts/lighthouse/audit-environment';

describe('auditEnvironment', () => {
    it('points every URL at this machine', () => {
        const urls = Object.entries(auditEnvironment(3190))
            .filter(([key]) => /URL$|SRC$/.test(key))
            .map(([, value]) => new URL(value).hostname);

        expect(urls.length).toBeGreaterThan(0);
        for (const host of urls) expect(['localhost', '127.0.0.1']).toContain(host);
    });

    it('sends analytics to the sink port', () => {
        const environment = auditEnvironment(3190);

        expect(environment.VITE_FARO_URL).toBe('http://127.0.0.1:3190/collect');
        expect(environment.VITE_UMAMI_SRC).toBe('http://127.0.0.1:3190/script.js');
    });
});

describe('generatorScripts', () => {
    it('finds the runtime-config and security.txt generators, in order', () => {
        const names = generatorScripts('docker/docker-entrypoint.d').map((file) =>
            file.split('/').at(-1)
        );

        expect(names.slice(0, 2)).toEqual([
            '40-generate-runtime-config.sh',
            '41-generate-security-txt.sh'
        ]);
    });
});
