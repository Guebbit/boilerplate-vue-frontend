---
source: src/modules/webhooks/tests/webhook-target-confirm-once.spec.ts
sha256: 7535ac292c37d9caf66df994e2224d02c886886e6b34158f77a44193d16dca3b
signature: 555256e4c83de0acfdb0d926ef206a9fd272b37b575fce13b03144d5de1872a6
generated_at: 2026-11-10T06:16:54.466971+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-target-confirm-once.spec.ts

## Purpose

Vitest spec that verifies `WebhookTarget`'s confirm-then-write controls (remove secret, delete subscription, disable) are idempotent under a double-click race, and that the page's visible actions and secret-status labels track the subscription record's `actions` and `retiringSecrets` fields.

## Key elements

- **`SUBSCRIPTION`** – fixture `WebhookSubscription` with two secrets (one retiring), full `actions` set enabled, used to seed the store and mount the page.
- **`mountPage()`** – helper that seeds the Pinia store, mocks `removeSecret` / `deleteSubscription` / `disableSubscription` / `dialog.confirm`, and mounts `WebhookTarget` with the real router, Vuetify, and i18n. Returns the wrapper plus the spies for assertions.
- **`describe('a double press …')`** – three tests, each firing two simultaneous `click` events (`Promise.all`) on a different control and asserting `confirm` and the store write were called exactly once.
- **`describe('what the page offers …')`** – three tests covering: retiring-secret vs. current-secret labels, enable/disable swap plus auto-disabled status when `enabled: false`, and full action hiding when every `actions` flag is `false`.
- **Router setup** – builds a memory-history router from `collectModuleRoutes(enabledModules)` so the page's internal links resolve without a network.

## Relationships

- **`src/modules/webhooks/views/WebhookTarget.vue`** – the component under test; mounted with `props: { id }` and the spies above.
- **`src/modules/webhooks/store.ts`** – `useWebhooksStore` provides `addSubscriptionRecord`, `watchSubscription` (mocked), `removeSecret`, `deleteSubscription`, `disableSubscription`, `selectedSubscriptionId`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope so the Pinia/Pinia plugin wiring that `collectModuleRoutes` and the store depend on is registered before any test runs.

## Notes

- Both clicks are fired via `Promise.all([...])` to simulate a true double-tap before the first `confirm` resolves; the assertion is that the second click is swallowed rather than queued.
- `watchSubscription` is replaced with a no-op `vi.fn()` so the page's own reactive watch doesn't re-fetch or reset state mid-test.
- The "hides every write" test asserts on a fixed list of `data-test` attributes; adding a new actionable control to `WebhookTarget` without adding it here will make the test silently pass (it only checks absence of the listed hooks).
