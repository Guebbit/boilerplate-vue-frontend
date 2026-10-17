---
source: src/modules/webhooks/store.ts
sha256: 64773930672373a729e8055fd6a88ed8a55095f5886468b5e497e040f9fc1aa0
generated_at: 2026-10-17T01:51:12.657090+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/store.ts

## Purpose

Pinia store that manages webhook subscription CRUD, the read-only delivery log, the event catalogue, and the hand-written secret-lifecycle actions. It exists as a single store so that the subscription, delivery, and event views share one source of truth for state, pagination, caching, and loading indicators.

## Key elements

- **`useWebhooksStore`** — the `defineStore('webhooks', …)` setup-store export; the single entry point for all views.
- **Subscriptions CRUD instance** (`useStructureCrudApi`) — exposes `subscriptions` (dictionary), `subscriptionsList`, `getSubscription`, `addSubscriptionRecord`, `editSubscriptionRecord`, `selectedSubscriptionId`, `currentSubscription`, `fetchSubscriptions`, `watchSubscriptionsSearch`, `updateSubscription`, `deleteSubscription`, `fetchAnySubscriptions`, and pagination state. Backs the list, create, edit, and target views.
- **`watchSubscription(idSource)`** — reactive watcher that selects a subscription by id from cache; triggers a one-time `fetchAllSubscriptions()` backfill if the id is unknown. No `GET /subscriptions/{id}` endpoint exists, so this is the only "get by id" path.
- **`createSubscription(data)`** — hand-written create that calls the API via `fetchAnySubscriptions`, scrubs `secret`/`newSecret` before caching the rest via `editSubscriptionRecord`, and returns the full response (including the one-time plaintext secret) to the caller.
- **`rotateSecret(id)`** — mints a new secret without removing the old one; same scrub-and-cache pattern as `createSubscription`. Returns the response with `newSecret`.
- **`removeSecret(id, secretId)`** — drops one secret from the ring via its own dedicated action route (not `updateOne`); response has no secret to scrub, so it caches directly.
- **Deliveries instance** (`useStructureCrudApi`) — read + `updateTarget` only. Exposes `deliveries`, `deliveriesList`, `deliveryFilters`, pagination state, `watchDeliveriesSearch`, and `updateTargetDelivery`.
- **`replayDelivery(id)`** — calls `replayWebhookDelivery` through the generic `updateTarget` path; response is a full replacement record with no sensitive fields, so no manual scrubbing is needed.
- **Event catalogue** — `useAsyncAction`-wrapped fetch of `listWebhookEvents`; exposes `eventCatalogue` (computed, defaults to `[]`), `loadingEventCatalogue`, `errorEventCatalogue`, and `fetchEventCatalogue()`.
- **`MAX_PAGE_SIZE`** (100) — the API's page-size ceiling, reused as the "fetch everything" size for `fetchAllSubscriptions`; shops beyond 100 subscriptions will not see all entries in the deliveries filter dropdown or Target/Edit hydration.
- **`SubscriptionFilters` / `DeliveryFilters`** — local interfaces defining the non-pagination query parameters for each resource.

## Relationships

- **`views/WebhooksList.vue`** — consumes the subscriptions list instance (paginated search, filters, loading, delete).
- **`views/WebhookCreate.vue`** — calls `createSubscription`, reads `eventCatalogue` / `fetchEventCatalogue`, and receives the one-time secret for the reveal modal.
- **`views/WebhookEdit.vue`** — calls `updateSubscription`, `rotateSecret`, `removeSecret`; hydrates the current record via `watchSubscription`.
- **`views/WebhookTarget.vue`** — hydrates via `watchSubscription`; calls `rotateSecret` / `removeSecret` for the secret ring UI.
- **`views/WebhookDeliveries.vue`** — consumes the deliveries instance (paginated search, filters by `subscriptionId` / `status`) and calls `replayDelivery`.
- **`tests/store.spec.ts`** — unit-tests the store's actions, state, and caching behaviour directly.
- **`tests/webhook-create-view.spec.ts`** / **`tests/webhook-edit-view.spec.ts`** — integration tests that exercise the store through the view components.

## Notes

- **No `get` endpoint for subscriptions.** There is no `GET /subscriptions/{id}` route; the store relies entirely on cache hydration via `fetchAllSubscriptions` + `getSubscription(id)`. Any code that assumes a per-id fetch will silently miss.
- **Secret scrubbing is intentional and asymmetric.** `createSubscription` and `rotateSecret` strip `secret`/`newSecret` before caching; `removeSecret` and `replayDelivery` do not need to. Do not "simplify" these into the generic path without re-evaluating the plaintext-secret risk.
- **Scrub-and-cache lives inside the `fetchAny` callback**, not in a `.then` on its result, because `fetchAny` widens the return type to `| undefined` and the no-`key` call site makes that branch unreachable. Moving it out breaks the type narrowing.
- **`fetchEventCatalogue` resolves (never rejects)** into `errorEventCatalogue`; callers should check that ref rather than wrap in try/catch.
- **`MAX_PAGE_SIZE` is a hard cap**, not a config. Increasing it requires the backend to raise `listWebhookSubscriptionsQueryPageSizeMax`.
- The store follows the same shape as the users store (per the in-file comment): one `defineStore`, `useStructureCrudApi` for generic ops, hand-written actions beside them.
