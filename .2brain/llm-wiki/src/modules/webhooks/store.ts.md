---
source: src/modules/webhooks/store.ts
sha256: c7fcf4b7c452c757094da5a08d3f5be7ccdb9f2a99e11e94f60d15aa5a1ac4bc
signature: 0bfb23951050b986aa4fce3996facd147d8cce17043487677cdd4f0a354ea5b4
generated_at: 2026-11-10T06:13:39.163556+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/store.ts

## Purpose

Pinia store (`useWebhooksStore`) that manages webhook subscription CRUD and the delivery log. It wraps two `useStructureCrudApi` instances (subscriptions: full CRUD; deliveries: read + replay only) alongside hand-written actions for routes that the generic shape cannot cover without leaking one-time plaintext secrets into the cache.

## Key elements

- **`useWebhooksStore`** – the exported Pinia store (setup-store syntax, key `'webhooks'`).
- **`fetchAllSubscriptions`** – `fetchList` for subscriptions; uses `MAX_PAGE_SIZE` (the API's own ceiling) to backfill the cache for the deliveries filter dropdown.
- **`watchSubscription` / `watchSubscriptionsSearch`** – `watchOne` / `watchList` for detail pages and the paginated list screen respectively.
- **`createSubscription(data)`** – hand-written create; calls `createWebhookSubscription`, scrubs `secret`/`newSecret` before caching the remainder via `editSubscriptionRecord`, and returns the full response (secret included) for the one-time reveal modal.
- **`createSecret(id)`** – mints a new secret on the ring; same scrub-and-cache pattern; returns `newSecret` to the caller.
- **`removeSecret(id, secretId)`** – drops one ring entry via its dedicated action route; caches the (secret-free) response directly.
- **`enableSubscription(id)` / `disableSubscription(id)`** – toggle status via their own action routes; responses carry no secret and are cached as-is.
- **`writingSubscription`** – computed boolean; true while any `key: ['write']` action is in flight (disables target-page buttons).
- **`WRITE_SETTINGS`** – `{ key: ['write'], forced: true }` shared by all write actions so they bypass the query cache.
- **Deliveries block** – `deliveries`, `deliveriesList`, `deliveryFilters`, `watchDeliveriesSearch`, `updateTargetDelivery` (replay), `deliveriesTotalItems`, pagination state.
- **`SubscriptionFilters`** – `{ enabled?, autoDisabled? }`.
- **`DeliveryFilters`** – `{ subscriptionId?, status? }`.

## Relationships

- **`WebhookCreate.vue`** – calls `createSubscription`, reads the returned secret for the reveal modal, then clears local state.
- **`WebhookEdit.vue`** – binds `watchSubscription` for the record, calls `updateSubscription` for generic field edits.
- **`WebhookTarget.vue`** – calls `createSecret`, `removeSecret`, `enableSubscription`, `disableSubscription`; reads `writingSubscription` to disable buttons.
- **`WebhooksList.vue`** – drives `watchSubscriptionsSearch`, `subscriptionFilters`, pagination state.
- **`WebhookDeliveries.vue`** – drives `watchDeliveriesSearch`, `deliveryFilters`, calls `updateTargetDelivery` (replay); uses `fetchAllSubscriptions`'s cached list to populate the subscription filter dropdown.
- **`store.spec.ts`** – unit-tests the hand-written actions and cache behavior.
- **`webhook-create-view.spec.ts` / `webhook-edit-view.spec.ts` / `webhook-target-confirm-once.spec.ts`** – component tests that mock or observe store interactions.

## Notes

- **Secret scrubbing is intentional and load-bearing.** `createSubscription` and `createSecret` destructure out `secret`/`newSecret` before calling `editSubscriptionRecord`. The generic `createOne`/`updateOne` paths would cache the raw response, parking plaintext in store state indefinitely.
- **`fetchAny` vs `fetchList`.** `fetchAllSubscriptions` (the `fetchList` alias) uses `MAX_PAGE_SIZE`, not `Infinity`—there is no unpaginated endpoint. Shops exceeding that ceiling will miss entries in the deliveries filter dropdown; this is a known, accepted trade-off.
- **`WRITE_SETTINGS.forced: true`.** A keyed `fetchAny` without `forced` would be served from the query cache, so every write action must opt in.
- **Replay is the one write action that uses the generic path.** `updateTargetDelivery` (backed by `replayWebhookDelivery`) returns a full replacement record with no secret, so `updateTarget` is safe and appropriate—no manual scrubbing needed.
- **Detail pages resolve past page one.** `watchSubscription` (`watchOne`) fetches by id independently of the list's current page, so navigating to a record beyond the first page still works.
