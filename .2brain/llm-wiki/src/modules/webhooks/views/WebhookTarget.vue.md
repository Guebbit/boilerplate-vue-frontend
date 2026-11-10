---
source: src/modules/webhooks/views/WebhookTarget.vue
sha256: 272c220bf8498b08a279fb8212ed0fb997a3ea30f99792c3eb40f4fde7a52024
signature: 272c220bf8498b08a279fb8212ed0fb997a3ea30f99792c3eb40f4fde7a52024
generated_at: 2026-11-10T06:18:06.005240+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookTarget.vue

## Purpose

Read-only webhook subscription detail page. Given a route `id`, it loads the subscription from the webhooks store, renders its identity fields (URL, description, event types, timestamps) in a standard detail layout, and exposes the four mutating actions (enable, disable, rotate secret, remove secret, delete) gated by the record's own `actions` flags.

## Key elements

- **Component name block** (`<script>` export) — sets `name: 'WebhookTargetPage'` for devtools / `<KeepAlive>`; required because `<script setup>` cannot declare a name.
- **`id` prop** — the subscription identifier, passed from the route; drives every store call.
- **`watchSubscription(() => id, { onError: useMissingRecord() })`** — reactive loader; a 404/403 bails out to the Error page via the `onError` handler.
- **`heroTitle` / `heroDescription` / `subscriptionStatus`** — computed display values for the hero and the first stat card; fall back to `EMPTY_VALUE` or the raw `id` while loading.
- **`retiresAtBySecret`** — a `Map<secretId, retiresAt>` built from `currentSubscription.retiringSecrets`, used to label which secret is current vs. superseded.
- **`revealedSecret` ref** — holds the one-time secret value returned by `createSecret`; rendered in `SecretRevealModal` and cleared on dismissal.
- **`handleEnable` / `handleDisable`** — toggle the subscription; disable goes through a `useDialogStore().confirm()` and is wrapped in `singleFlight` to prevent double-fires.
- **`handleCreateSecret`** — calls `createSecret(id)`; on success stores `updated.newSecret` in `revealedSecret` to open the modal.
- **`handleRemoveSecret(secretId)`** — confirm → `removeSecret(id, secretId)`; `singleFlight`-guarded; shared inline alert above the secrets table.
- **`handleDelete`** — confirm → `deleteSubscription(id)` → toast → `router.push` to `WebhooksList`; `singleFlight`-guarded.
- **`asideFields`** — computed `DetailFieldRow[]` for the created/updated timestamps in the aside card.
- **Per-action `useBlockingError()` instances** — `statusError`, `createSecretError`, `removeSecretError`, `deleteError`; each renders an `InlineErrorAlert` adjacent to its own control area.

## Relationships

- **`src/modules/webhooks/store.ts`** — Primary data source. Provides `watchSubscription`, `createSecret`, `removeSecret`, `deleteSubscription`, `enableSubscription`, `disableSubscription`, and the `currentSubscription` / `writingSubscription` refs via `storeToRefs`.
- **`src/modules/webhooks/domain/subscription-status.ts`** — `subscriptionStatusOf(currentSubscription)` maps the raw status to a key used to look up the i18n label in the stat card.
- **`src/modules/webhooks/components/SubscriptionStatusChip.vue`** — Imported for rendering the status chip in the detail body (template section).
- **`src/modules/webhooks/tests/webhook-target-confirm-once.spec.ts`** — Unit spec that verifies the `singleFlight` confirm-once behaviour of the destructive actions (disable, remove-secret, delete).

## Notes

- The `id` is a **prop**, not a `useRoute().params` read; the parent route wrapper is expected to pass it down. All store calls guard with `if (!id) return;`.
- `revealedSecret` is intentionally **never written to the store** — the store's `createSecret` action returns it in the response payload, and this component is the sole consumer. Clear it (`revealedSecret = undefined`) only via the modal's `@done` event.
- Destructive actions (disable, remove-secret, delete) are wrapped in `singleFlight` **outside** the confirm dialog, so a rapid double-click before the dialog even opens is coalesced. Non-destructive enable/create-secret are not wrapped (the server is expected to be idempotent or the UI blocks via the in-place alert).
- After a successful delete the component navigates away with `void router.push(...)`; the `// eslint-disable-next-line` comment acknowledges that vue-router signals navigation failure asynchronously via `router.onError`, not through the returned promise.
- The component uses `EMPTY_VALUE` (from `formatters.ts`) as the universal "not yet loaded / not applicable" display sentinel rather than empty strings or `null`.
