/**
 * `scripts/lighthouse/analytics-sink.ts`: answers analytics posts with nothing, on loopback only.
 */
import { describe, it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { startAnalyticsSink } from '../../../../scripts/lighthouse/analytics-sink';

describe('startAnalyticsSink', () => {
    it('answers a POST with 204 and the script with an empty 200', async () => {
        const sink = await startAnalyticsSink(0);
        const { port, address } = sink.address() as AddressInfo;
        try {
            const post = await fetch(`http://127.0.0.1:${String(port)}/collect`, {
                method: 'POST',
                body: '{}'
            });
            const script = await fetch(`http://127.0.0.1:${String(port)}/script.js`);

            expect(address).toBe('127.0.0.1');
            expect(post.status).toBe(204);
            expect(script.status).toBe(200);
            expect(await script.text()).toBe('');
        } finally {
            sink.close();
        }
    });

    it('rejects when the port is taken', async () => {
        const first = await startAnalyticsSink(0);
        const { port } = first.address() as AddressInfo;
        try {
            await expect(startAnalyticsSink(port)).rejects.toThrow(/EADDRINUSE/);
        } finally {
            first.close();
        }
    });
});
