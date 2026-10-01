/**
 * The seeded demo subscription's signing secret — the backend's `WEBHOOK_DEMO_SECRET`
 * (`scenarios/webhooks.ts`), a fixed public demo value. The `whsec_` half decodes to
 * "demo-webhook-secret-do-not-use-in-production".
 *
 * Alone in its file because a journey imports it, and a journey runs in the browser: the sink
 * beside it (`./webhook-sink.ts`) imports `node:http` and `node:crypto`.
 */
export const DEMO_WEBHOOK_SECRET =
    'whsec_ZGVtby13ZWJob29rLXNlY3JldC1kby1ub3QtdXNlLWluLXByb2R1Y3Rpb24=';
