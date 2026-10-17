---
source: src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts
sha256: 1882ac59794ca97b7bbd8c2918ddf1963b3e0cc05ac40b765bcdb22f32806a40
generated_at: 2026-10-17T01:52:25.924932+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts

## Purpose

Verifies that each row rendered by `WebhookDeliveriesFilters` carries a stable `data-test="webhook-delivery-row"` attribute and that the event type string is visible in the row's text. This lets other specs (and e2e flows) assert "a delivery for `order.created` exists" without coupling to delivery status, which stays `pending` in the absence of a live broker.

## Key elements

- **`delivery(id, eventType)`** — factory that returns a minimal `WebhookDelivery` object (id, subscriptionId, eventId, eventType, attempt, status, timestamps) used as fixture data for the test.
- **`describe('WebhookDeliveriesFilters rows')` / `it(...)`** — single test that mounts the component with two deliveries, awaits a render tick, then asserts two rows matching `[data-test=webhook-delivery-row]` and that each row's text contains its respective event type.

## Relationships

- **`src/modules/webhooks/components/WebhookDeliveriesFilters.vue`** — the SUT. Mounted via `@vue/test-utils` with `deliveries`, `total`, `pages`, `loading`, `subscriptions`, and `replayingIds` props; vuetify and i18n injected as global plugins.
- **`tests/support/unit/mounted-vm.ts`** — provides `nextRenderTick`, an async helper that waits for the component to finish rendering before assertions run.

## Notes

- All fixture deliveries use `status: 'pending'` deliberately; the test never asserts on status. Any future change that gates row rendering on status will break this spec.
- The selector is the `data-test` attribute, not a CSS class — treat it as a semi-stable contract for cross-spec lookups.
- The component receives `subscriptions: []` and an empty `replayingIds` set, so filter/replay logic is out of scope here.
