/**
 * Reads what a `webhook-tester` session has captured — the live profile's webhook receiver.
 *
 * The demo profile hosts its own sink (`./webhook-sink.ts`); the live one runs the real
 * `tarampampam/webhook-tester` container (`docs/tools/live-e2e.md`, step 1) behind a TLS proxy, and
 * the backend's seeded subscription points at one of its sessions. This turns the tester's HTTP API into the
 * same shape the sink answers in, so a journey reads both the same way.
 *
 * Pure of Cypress, and outside `tests/support/e2e/`, so the unit suite can pin it. The `cy.task`
 * wiring is in `cypress.config.ts`.
 */
import { get } from 'node:https';
import type { SinkRequest } from './webhook-sink';
import { WEBHOOK_SINK_TLS } from './webhook-tls';

/** One request a receiver captured, whichever profile's receiver it was: a sink request without the seeded-secret verdict. */
export type ReceivedWebhook = Omit<SinkRequest, 'signatureValid'>;

/** The slice of the tester's `GET /api/session/<id>/requests` answer this reads. */
interface TesterRequest {
    headers: { name: string; value: string }[];
    request_payload_base64: string;
    url: string;
    captured_at_unix_milli: number;
}

/**
 * GET one tester API address over TLS, trusting only the demo test CA.
 *
 * `node:https` rather than `fetch`: Cypress's Node process cannot be given an extra CA at start
 * (`NODE_EXTRA_CA_CERTS` is read at process start), and `fetch` takes no per-call `ca`.
 * https://nodejs.org/api/https.html#httpsgeturl-options-callback
 *
 * @param url - the API address
 * @returns the status and the whole body
 */
const getFromTester = (url: string): Promise<{ status: number; body: string }> =>
    new Promise((resolve, reject) => {
        // `ca`: replaces the default roots with the demo CA, which is all the proxy's leaf chains to.
        get(url, { ca: WEBHOOK_SINK_TLS.ca }, (response) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => {
                resolve({
                    status: response.statusCode ?? 0,
                    body: Buffer.concat(chunks).toString('utf8')
                });
            });
            response.on('error', reject);
        }).on('error', reject);
    });

/**
 * The tester's API address for the requests a subscription URL's session captured.
 *
 * @param subscriptionUrl - the subscription's URL: the tester's origin, then the session id
 * @returns the API URL, and the request path the sink shape names
 */
const sessionRequestsUrl = (subscriptionUrl: string): { api: string; path: string } => {
    const { origin, pathname } = new URL(subscriptionUrl);
    const sessionId = pathname.split('/').findLast(Boolean) ?? '';
    return { api: `${origin}/api/session/${sessionId}/requests`, path: pathname };
};

/**
 * Every request the session behind `subscriptionUrl` has captured, oldest first.
 *
 * Header names are lower-cased, as the sink does, because the tester title-cases them.
 *
 * A session the tester has not created yet answers 404, and the tester creates one only when the
 * first webhook arrives (`AUTO_CREATE_SESSIONS`) — so a 404 is "nothing yet", an empty list.
 *
 * @param subscriptionUrl - the seeded subscription's URL
 * @throws {Error} when the tester answers anything but 200 or 404 (a connection that fails rejects too)
 */
export const readWebhookTester = (subscriptionUrl: string): Promise<ReceivedWebhook[]> => {
    const { api, path } = sessionRequestsUrl(subscriptionUrl);
    return getFromTester(api).then(({ status, body }) => {
        if (status === 404) return [];
        if (status !== 200) throw new Error(`webhook-tester answered ${String(status)} for ${api}`);
        const captured = JSON.parse(body) as TesterRequest[];
        // Oldest first, as the sink lists them, whatever order the tester answers in.
        return captured
            .toSorted(
                (first, second) => first.captured_at_unix_milli - second.captured_at_unix_milli
            )
            .map((request) => ({
                path,
                headers: Object.fromEntries(
                    request.headers.map(({ name, value }) => [name.toLowerCase(), value])
                ),
                body: Buffer.from(request.request_payload_base64, 'base64').toString('utf8')
            }));
    });
};
