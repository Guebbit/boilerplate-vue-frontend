/**
 * A webhook receiver the Cypress node process hosts, for the demo profile.
 *
 * The demo backend has no message broker, so nothing delivers a webhook by itself — but an admin
 * can REPLAY a delivery, and that POSTs synchronously to the subscription's URL. The seeded
 * subscription points at `NODE_WEBHOOK_DEMO_SINK_URL` (the backend's `scenarios/webhooks.ts`), and
 * the SSRF guard exempts exactly that host from its private-address check in development. This is
 * the listener behind the URL, so a spec can read what arrived and check its signature.
 *
 * It speaks TLS, like every webhook URL must: it serves the test leaf from `./webhook-tls.ts`,
 * which the demo backend trusts through `NODE_EXTRA_CA_CERTS`.
 *
 * Why not a real `webhook-tester`: the live profile has one (`e2e-live.yml`), but the demo profile
 * runs with no Docker. One listener per Cypress process, on a port its backend was told about.
 *
 * Pure of Cypress, and outside `tests/support/e2e/`, so the unit suite can pin it. The `cy.task`
 * wiring is in `cypress.config.ts`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { createServer, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { DEMO_WEBHOOK_SECRET } from './webhook-demo-secret';
import { WEBHOOK_SINK_TLS } from './webhook-tls';

/** The port a single-process demo run (`npm run test:e2e:serial` and friends) hosts the sink on. */
export const SINGLE_PROCESS_SINK_PORT = 3200;

/** First sink port of the sharded run: shard N hosts on this plus N, beside its backend on 3101+N. */
export const SHARD_SINK_PORT_BASE = 3201;

/**
 * The backend's `NODE_WEBHOOK_DEMO_SINK_URL` for a sink on `port`.
 *
 * The literal `127.0.0.1`, never `localhost`: the SSRF guard's DNS lookup skips `/etc/hosts`.
 *
 * @param port - the sink's port
 */
export const sinkUrlForPort = (port: number): string => `https://127.0.0.1:${String(port)}`;

/** The seeded subscription's signing secret, still reachable from here for the sink's own readers. */
export { DEMO_WEBHOOK_SECRET } from './webhook-demo-secret';

/** One request the sink received. */
export interface SinkRequest {
    /** The request path, e.g. the subscription's session id. */
    path: string;
    /** The headers, names lower-cased. */
    headers: Record<string, string>;
    /** The body exactly as received. */
    body: string;
    /** Whether `webhook-signature` verifies against {@link DEMO_WEBHOOK_SECRET} over this body. */
    signatureValid: boolean;
}

/** A running sink. */
export interface WebhookSink {
    /** The port it listens on — the one asked for, or the one the OS picked for port 0. */
    port: number;
    /** What has arrived since the last {@link WebhookSink.clear}, oldest first. */
    requests: () => SinkRequest[];
    /** Forget everything received. */
    clear: () => void;
    /** Stop listening. */
    close: () => Promise<void>;
}

/** The three Standard Webhooks headers a signature is computed from. */
interface SignedHeaders {
    id: string | undefined;
    timestamp: string | undefined;
    signature: string | undefined;
}

/**
 * Whether a Standard Webhooks delivery verifies under `secret`.
 *
 * The signed content is `<webhook-id>.<webhook-timestamp>.<body>`, HMAC-SHA256 with the base64
 * half of the `whsec_` secret as the key; the header carries one or more space-separated
 * `v1,<base64>` entries and any one matching is enough (a rotation signs with both secrets).
 * https://www.standardwebhooks.com
 *
 * No timestamp window: a replay of an old delivery is exactly what the admin UI offers.
 *
 * @param headers - the three signing headers
 * @param body - the raw body
 * @param secret - the `whsec_…` signing secret
 */
export const verifiesStandardWebhook = (
    { id, timestamp, signature }: SignedHeaders,
    body: string,
    secret: string
): boolean => {
    if (!id || !timestamp || !signature) return false;

    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    // node:crypto HMAC: https://nodejs.org/api/crypto.html#cryptocreatehmacalgorithm-key-options
    const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();

    return signature.split(' ').some((entry) => {
        if (!entry.startsWith('v1,')) return false;
        const provided = Buffer.from(entry.slice('v1,'.length), 'base64');
        // `timingSafeEqual` throws on unequal lengths, so a short entry is a mismatch first.
        return provided.length === expected.length && timingSafeEqual(provided, expected);
    });
};

/**
 * Header values as plain strings: Node gives a repeated header as an array.
 *
 * @param headers - Node's parsed request headers
 */
const flattenHeaders = (headers: IncomingHttpHeaders): Record<string, string> =>
    Object.fromEntries(
        Object.entries(headers).map(([name, value]) => [
            name,
            Array.isArray(value) ? value.join(', ') : (value ?? '')
        ])
    );

/**
 * Start a sink on `port`, bound to loopback.
 *
 * Answers 200 to everything, like a receiver that works: the backend counts a non-2xx as a failed
 * delivery.
 *
 * @param port - where to listen; 0 lets the OS pick one
 * @returns the running sink
 * @throws {Error} when the port is taken (an earlier run still holding it)
 */
export const startWebhookSink = (port: number): Promise<WebhookSink> =>
    new Promise((resolve, reject) => {
        let received: SinkRequest[] = [];

        // node:https.createServer: https://nodejs.org/api/https.html#httpscreateserveroptions-requestlistener
        // `cert` and `key` are the committed test leaf; the CA is the backend's to trust, not ours to serve.
        const server: Server = createServer(
            { cert: WEBHOOK_SINK_TLS.cert, key: WEBHOOK_SINK_TLS.key },
            (request, response) => {
                const chunks: Buffer[] = [];
                request.on('data', (chunk: Buffer) => chunks.push(chunk));
                request.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    const headers = flattenHeaders(request.headers);
                    received.push({
                        path: request.url ?? '/',
                        headers,
                        body,
                        signatureValid: verifiesStandardWebhook(
                            {
                                id: headers['webhook-id'],
                                timestamp: headers['webhook-timestamp'],
                                signature: headers['webhook-signature']
                            },
                            body,
                            DEMO_WEBHOOK_SECRET
                        )
                    });
                    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
                });
            }
        );

        server.once('error', reject);
        // Loopback only: the backend reaches it at 127.0.0.1, and nothing else should.
        server.listen(port, '127.0.0.1', () =>
            resolve({
                // A TCP server's address is an object; the string form is for Unix sockets.
                port: (server.address() as AddressInfo).port,
                requests: () => [...received],
                clear: () => {
                    received = [];
                },
                close: () =>
                    new Promise((done) => {
                        server.close(() => done());
                    })
            })
        );
    });
