/**
 * `scripts/e2e/webhook-sink.ts` — the receiver the demo profile's replayed deliveries land on, and
 * the Standard Webhooks check it applies to each.
 *
 * A real listener on a real port: the sink's job is to be a receiver, and a stubbed one would prove
 * only that the stub works.
 */
import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
    DEMO_WEBHOOK_SECRET,
    SHARD_SINK_PORT_BASE,
    SINGLE_PROCESS_SINK_PORT,
    sinkUrlForPort,
    startWebhookSink,
    verifiesStandardWebhook,
    type WebhookSink
} from '../../../../scripts/e2e/webhook-sink';

/** Signs `body` the way the backend does, under {@link DEMO_WEBHOOK_SECRET}. */
const sign = (id: string, timestamp: string, body: string): string =>
    `v1,${createHmac('sha256', Buffer.from(DEMO_WEBHOOK_SECRET.replace('whsec_', ''), 'base64'))
        .update(`${id}.${timestamp}.${body}`)
        .digest('base64')}`;

describe('verifiesStandardWebhook', () => {
    const body = '{"type":"order.created"}';

    it('accepts a signature computed over id, timestamp and body', () => {
        expect(
            verifiesStandardWebhook(
                {
                    id: 'msg_1',
                    timestamp: '1700000000',
                    signature: sign('msg_1', '1700000000', body)
                },
                body,
                DEMO_WEBHOOK_SECRET
            )
        ).toBe(true);
    });

    it('accepts one matching entry among several, as a rotation sends', () => {
        const signature = `v1,AAAA ${sign('msg_1', '1', body)}`;

        expect(
            verifiesStandardWebhook(
                { id: 'msg_1', timestamp: '1', signature },
                body,
                DEMO_WEBHOOK_SECRET
            )
        ).toBe(true);
    });

    it.each([
        ['a different body', 'msg_1', '1', '{"type":"other"}'],
        ['a different id', 'msg_2', '1', body],
        ['a different timestamp', 'msg_1', '2', body]
    ])('refuses %s', (_label, id, timestamp, received) => {
        const signature = sign('msg_1', '1', body);

        expect(
            verifiesStandardWebhook({ id, timestamp, signature }, received, DEMO_WEBHOOK_SECRET)
        ).toBe(false);
    });

    it('refuses a missing header, a foreign scheme and a short signature', () => {
        const base = { id: 'msg_1', timestamp: '1' };

        expect(
            verifiesStandardWebhook({ ...base, signature: undefined }, body, DEMO_WEBHOOK_SECRET)
        ).toBe(false);
        expect(
            verifiesStandardWebhook({ ...base, signature: 'v2,abc' }, body, DEMO_WEBHOOK_SECRET)
        ).toBe(false);
        expect(
            verifiesStandardWebhook({ ...base, signature: 'v1,abc' }, body, DEMO_WEBHOOK_SECRET)
        ).toBe(false);
    });
});

describe('the ports', () => {
    it('keeps the single-process port clear of the shard range', () => {
        expect(SINGLE_PROCESS_SINK_PORT).toBeLessThan(SHARD_SINK_PORT_BASE);
    });

    it('names the loopback literal, never a hostname', () => {
        expect(sinkUrlForPort(3201)).toBe('http://127.0.0.1:3201');
    });
});

/** POST `body` to the sink with the three signing headers. */
const deliver = (port: number, body: string, signature: string) =>
    fetch(`${sinkUrlForPort(port)}/session-id`, {
        method: 'POST',
        headers: {
            'webhook-id': 'msg_9',
            'webhook-timestamp': '1700000000',
            'webhook-signature': signature
        },
        body
    });

describe('startWebhookSink', () => {
    let sink: WebhookSink | undefined;

    afterEach(async () => {
        await sink?.close();
        sink = undefined;
    });

    it('records what arrived, with its verdict on the signature, and forgets on clear', async () => {
        sink = await startWebhookSink(0);
        const { port } = sink;
        const body = '{"type":"order.created"}';

        const good = await deliver(port, body, sign('msg_9', '1700000000', body));
        await deliver(port, body, 'v1,forged');

        expect(good.status).toBe(200);
        const seen = sink.requests();
        expect(seen.map((request) => request.signatureValid)).toEqual([true, false]);
        expect(seen[0]).toMatchObject({ path: '/session-id', body });
        expect(seen[0].headers['webhook-id']).toBe('msg_9');

        sink.clear();
        expect(sink.requests()).toEqual([]);
    });

    it('refuses to start on a port that is taken', async () => {
        sink = await startWebhookSink(0);
        const { port } = sink;

        await expect(startWebhookSink(port)).rejects.toThrow();
    });
});
