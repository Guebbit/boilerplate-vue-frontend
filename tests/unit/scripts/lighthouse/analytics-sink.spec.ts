/**
 * `scripts/lighthouse/analytics-sink.ts`: answers analytics posts with nothing, on loopback only.
 */
import { beforeEach, describe, it, expect } from 'vitest';
import { http, passthrough } from 'msw';
import { server } from '../../../support/unit/msw-server.ts';
import type { AddressInfo } from 'node:net';
import { startAnalyticsSink } from '../../../../scripts/lighthouse/analytics-sink';

describe('startAnalyticsSink', () => {
    // The sink is a real loopback listener; the shared MSW server would refuse the call otherwise.
    // https://mswjs.io/docs/api/passthrough
    beforeEach(() => {
        server.use(http.all(/^http:\/\/127\.0\.0\.1:\d+\//, () => passthrough()));
    });

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
