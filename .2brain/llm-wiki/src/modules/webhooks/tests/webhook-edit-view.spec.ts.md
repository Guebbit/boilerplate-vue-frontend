---
source: src/modules/webhooks/tests/webhook-edit-view.spec.ts
sha256: 800a5c80e0eb231447cde402960041d33646145cf9b0dc04f03b8ec62107663f
signature: 9dab4f51aa5f03e198e3c62117117edf68c2970df7111fcb5ce01b941fa8ee5a
generated_at: 2026-11-10T06:16:44.734422+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-edit-view.spec.ts

## Purpose

Vitest spec that mounts the real `WebhookEdit` page against a memory-history router to verify the PATCH payload the form actually sends: `null` when the visitor clears the description, the key omitted when the field is untouched, and the 412-conflict recovery path. It deliberately does **not** test the page's own load (`watchSubscription`); that belongs to `store.spec.ts`.

## Key elements

- **`router`** – A `createMemoryHistory` router scoped to `collectModuleRoutes(enabledModules)`, mirroring the real app's route tree under `/:locale`.
- **`V_SELECT_STUB`** – Minimal template stub replacing Vuetify's multi-select (same shape used in `webhook-create-view.spec.ts`); always emits `['order.paid']`.
- **`SUBSCRIPTION`** – The single fixture record every test edits; carries a non-empty `description` and an `actions` object that disables the enable/disable toggle.
- **`mountPage()`** – Seeds the store cache via `store.addSubscriptionRecord`, mocks `watchSubscription` / `fetchEventCatalog`, spies on `updateSubscription` and `fetchSubscription`, then mounts `WebhookEdit` with the router, Vuetify, and i18n plugins. Returns `{ wrapper, update, fetch }` for assertions.
- **`beforeEach`** – Resets Pinia, clears `document.body`, loads the `en` locale, and navigates to `/en/webhooks/subscriptions/sub-1/edit`.
- **Test cases** (four):
  1. Cleared description → payload `description: null` (validated via `contractRequest`).
  2. Untouched description → payload is `{}` (key absent).
  3. 412 rejection → page shows reload button; clicking it calls `fetchSubscription(id, { forced: true })`.
  4. No enabled-toggle in DOM; `enabled` never appears in the sent payload.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/webhooks/views/WebhookEdit.vue` | The component under test; mounted directly. |
| `src/modules/webhooks/store.ts` | Imports `useWebhooksStore`; seeds the cache, then spies on `updateSubscription`, `fetchSubscription`, `watchSubscription`, and `fetchEventCatalog`. |
| `tests/support/unit/wire-modules.ts` | Calls `wireModulesIntoCore()` at module top-level so the router can resolve module routes. |
| `tests/support/unit/fixtures.ts` | Imports `aProblem` to build the 412 error response. |
| `tests/support/unit/orval-fixture-schema.ts` | Imports `contractRequest` to assert the outgoing body conforms to the `UpdateWebhookSubscriptionBody` OpenAPI schema rather than a plain deep-equal. |

## Notes

- `wireModulesIntoCore()` runs once at import time (module scope), not inside a test or `beforeEach`.
- The description-clearing test asserts the *absence* of an empty string via the schema-validated payload, catching a subtle bug where a controlled input could emit `''` instead of `null`.
- `SUBSCRIPTION.actions` encodes which toolbar buttons the page renders; the "no enabled toggle" test relies on `actions.enable` / `actions.disable` being the sole gate.
- The `VSelect` stub is intentionally dumb (always emits one value); it exists only so the form can submit without a real Vuetify select.
