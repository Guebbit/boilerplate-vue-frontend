/**
 * `scripts/e2e/payment-webhook.ts` — signing a payment-provider delivery the way the backend
 * verifies it: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`.
 */
import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DEMO_PAYMENT_WEBHOOK_SECRET,
    postPaymentWebhook,
    signPaymentWebhook
} from '../../../../scripts/e2e/payment-webhook';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('signPaymentWebhook', () => {
    it('is the hex HMAC of "<t>.<body>" under the secret, tagged with its timestamp', () => {
        const expected = createHmac('sha256', 'secret')
            .update('1700000000.{"id":"e"}')
            .digest('hex');

        expect(signPaymentWebhook('{"id":"e"}', 1_700_000_000, 'secret')).toBe(
            `t=1700000000,v1=${expected}`
        );
    });

    it('changes with the body, the timestamp and the secret', () => {
        const base = signPaymentWebhook('{"id":"e"}', 1, 's');

        expect(signPaymentWebhook('{"id":"f"}', 1, 's')).not.toBe(base);
        expect(signPaymentWebhook('{"id":"e"}', 2, 's')).not.toBe(base);
        expect(signPaymentWebhook('{"id":"e"}', 1, 't')).not.toBe(base);
    });
});

/** Stubs fetch and returns what it was sent. */
const stubFetch = (status: number) => {
    const sent: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
        sent.push({ url, init });
        return Promise.resolve(new Response(null, { status }));
    });
    return sent;
};

describe('postPaymentWebhook', () => {
    it('signs the exact bytes it sends, with the demo secret by default', async () => {
        const sent = stubFetch(200);

        const status = await postPaymentWebhook({
            apiUrl: 'http://api.test',
            event: { id: 'evt-1', status: 'succeeded' },
            timestamp: 1_700_000_000
        });

        expect(status).toBe(200);
        expect(sent[0].url).toBe('http://api.test/payments/webhook');
        const body = sent[0].init.body as string;
        expect(JSON.parse(body)).toEqual({ id: 'evt-1', status: 'succeeded' });
        expect((sent[0].init.headers as Record<string, string>)['x-payment-signature']).toBe(
            signPaymentWebhook(body, 1_700_000_000, DEMO_PAYMENT_WEBHOOK_SECRET)
        );
    });

    it('takes the secret the environment names over the demo one', async () => {
        vi.stubEnv('E2E_PAYMENT_WEBHOOK_SECRET', 'from-the-environment');
        const sent = stubFetch(200);

        await postPaymentWebhook({
            apiUrl: 'http://api.test',
            event: { id: 'evt-1' },
            timestamp: 5
        });

        const body = sent[0].init.body as string;
        expect((sent[0].init.headers as Record<string, string>)['x-payment-signature']).toBe(
            signPaymentWebhook(body, 5, 'from-the-environment')
        );
    });

    it('answers a refusal as a status, not a throw', async () => {
        stubFetch(400);

        await expect(
            postPaymentWebhook({ apiUrl: 'http://api.test', event: { id: 'evt-1' } })
        ).resolves.toBe(400);
    });
});
