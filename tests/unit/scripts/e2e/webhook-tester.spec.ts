/**
 * `scripts/e2e/webhook-tester.ts` — the tester's captured requests, read back in the sink's shape.
 *
 * A real TLS listener answering the tester's API, on the committed test leaf: the reader's job is to
 * speak HTTPS to it, trusting only the test CA.
 */
import { createServer, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { readWebhookTester } from '../../../../scripts/e2e/webhook-tester';
import { WEBHOOK_SINK_TLS } from '../../../../scripts/e2e/webhook-tls';

let server: Server | undefined;

/** Starts a fake tester answering `status` and `body` to every request; yields its origin. */
const fakeTester = (status: number, body: unknown): Promise<string> =>
    new Promise((resolve) => {
        server = createServer(
            { cert: WEBHOOK_SINK_TLS.cert, key: WEBHOOK_SINK_TLS.key },
            (request, response) => {
                // The path the reader asked for rides back in a header, so a test can pin the API address.
                response
                    .writeHead(status, {
                        'Content-Type': 'application/json',
                        'X-Asked': request.url ?? ''
                    })
                    .end(JSON.stringify(body));
            }
        );
        server.listen(0, '127.0.0.1', () =>
            resolve(`https://127.0.0.1:${String((server!.address() as AddressInfo).port)}`)
        );
    });

afterEach(
    () =>
        new Promise<void>((done) => {
            if (server) server.close(() => done());
            else done();
            server = undefined;
        })
);

describe('readWebhookTester', () => {
    it('asks the session named by the last path segment, and answers oldest first with lower-cased headers', async () => {
        const origin = await fakeTester(200, [
            {
                headers: [{ name: 'Webhook-Id', value: 'second' }],
                request_payload_base64: Buffer.from('{"n":2}').toString('base64'),
                url: 'x',
                captured_at_unix_milli: 2000
            },
            {
                headers: [{ name: 'Webhook-Id', value: 'first' }],
                request_payload_base64: Buffer.from('{"n":1}').toString('base64'),
                url: 'x',
                captured_at_unix_milli: 1000
            }
        ]);

        const received = await readWebhookTester(`${origin}/session-1`);

        expect(received.map((request) => request.headers['webhook-id'])).toEqual([
            'first',
            'second'
        ]);
        expect(received[0]).toMatchObject({ path: '/session-1', body: '{"n":1}' });
    });

    it('reads a session the tester has not created yet as nothing received', async () => {
        const origin = await fakeTester(404, {});

        expect(await readWebhookTester(`${origin}/not-yet`)).toEqual([]);
    });

    it('refuses an answer that is neither 200 nor 404, naming the address it asked', async () => {
        const origin = await fakeTester(500, {});

        await expect(readWebhookTester(`${origin}/broken`)).rejects.toThrow(
            /answered 500 for .*\/api\/session\/broken\/requests/
        );
    });
});
