/**
 * Signs and posts a payment-provider webhook, the way the provider would.
 *
 * The backend's `POST /payments/webhook/fake` authenticates by an HMAC over the raw body, so a spec
 * that wants a provider to nudge the server (a duplicate event id, a stale signature) has to sign
 * it itself. The event is thin: it names an intent, and the server asks the provider what became
 * of it, so a delivery cannot carry an outcome. The format is the backend's
 * `payments/providers/webhook-signature.ts`: `payment-signature: t=<unix seconds>,v1=<hex
 * HMAC-SHA256 of "<t>.<raw body>">`.
 *
 * Pure of Cypress, and outside `tests/support/e2e/`, so the unit suite can pin it. The `cy.task`
 * wiring is in `cypress.config.ts`.
 */
import { createHmac } from 'node:crypto';

/**
 * The demo backend's `NODE_PAYMENT_WEBHOOK_SECRET` (`scenarios/run-server.ts`). A live backend
 * sets its own, and a run points at it with `E2E_PAYMENT_WEBHOOK_SECRET`.
 */
export const DEMO_PAYMENT_WEBHOOK_SECRET = 'demo-payment-webhook-secret';

/** One dispute as the provider reports it — the contract's `DisputeReport`. */
export interface PaymentWebhookDispute {
    /** The provider's dispute id; one per payment. */
    disputeRef: string;
    kind: 'inquiry' | 'chargeback';
    status: 'needs_response' | 'under_review' | 'won' | 'lost' | 'accepted' | 'closed';
    /** One of the contract's closed reasons (`fraudulent`, `product_not_received`, …). */
    reason: string;
    /** A decimal in `currency`. */
    amount: number;
    /** ISO-4217, upper case: the payment's own. */
    currency: string;
    fundsWithdrawn: boolean;
    /** ISO time the evidence window closes. */
    evidenceDueBy?: string;
    /** ISO time of this report; the backend applies only a newer one than it holds. */
    observedAt: string;
    /** Where the shop answers, an `https` address. */
    dashboardUrl?: string;
}

/** The payment provider's event — the contract's `PaymentWebhookEvent`. */
export interface PaymentWebhookEvent {
    /** The provider's event id, logged. */
    id: string;
    /** Which intent the event is about. Omit for an event the API ignores. */
    providerRef?: string;
    /** Which refund the event is about, when it is about one. */
    refundRef?: string;
    /** The dispute's own state: the one thing a delivery carries beyond a pointer. */
    dispute?: PaymentWebhookDispute;
}

/** What {@link postPaymentWebhook} takes. */
export interface PaymentWebhookRequest {
    apiUrl: string;
    event: PaymentWebhookEvent;
    /** Unix seconds for the signature. Defaults to now; pass an old one to prove a stale delivery is refused. */
    timestamp?: number;
    /** The signing secret. Defaults to the one the environment names, else the demo's. */
    secret?: string;
}

/**
 * The `payment-signature` header value for `body`.
 *
 * @param body - the exact bytes that will be sent
 * @param timestamp - unix seconds
 * @param secret - the shared secret
 */
export const signPaymentWebhook = (body: string, timestamp: number, secret: string): string =>
    `t=${String(timestamp)},v1=${createHmac('sha256', secret)
        .update(`${String(timestamp)}.${body}`)
        .digest('hex')}`;

/**
 * Sign an event and POST it to `/payments/webhook/fake`.
 *
 * The body is serialised once and those same bytes are signed and sent: re-serialising between the
 * two would change the bytes and fail the signature.
 *
 * @param request - the API, the event, and optionally the timestamp and secret
 * @returns the HTTP status the backend answered; a refusal (400) is data, not a throw
 */
export const postPaymentWebhook = ({
    apiUrl,
    event,
    timestamp = Math.floor(Date.now() / 1000),
    secret = process.env.E2E_PAYMENT_WEBHOOK_SECRET ?? DEMO_PAYMENT_WEBHOOK_SECRET
}: PaymentWebhookRequest): Promise<number> => {
    const body = JSON.stringify(event);
    return fetch(`${apiUrl}/payments/webhook/fake`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'payment-signature': signPaymentWebhook(body, timestamp, secret)
        },
        body
    }).then((response) => response.status);
};
