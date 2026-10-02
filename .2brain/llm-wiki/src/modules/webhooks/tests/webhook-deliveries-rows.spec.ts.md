---
source: src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts
sha256: b3f06416ffa30d3d5d6479514f6491ac48f717337e26b9f04568511fc112b535
generated_at: 2026-10-02T15:56:47.126860+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts

## Purpose

Unit test for the `WebhookDeliveriesFilters` component's table rows. It verifies that every rendered row carries the `data-test="webhook-delivery-row"` hook and displays its event type, so higher-level specs can locate a delivery by type without asserting on its (always-`pending` in unit scope) status.

## Key elements

- **`delivery(id, eventType)`** – Factory that returns a fully-populated `WebhookDelivery` object. `status` is hard-coded to `'pending'` because no message broker is available in the unit environment.
- **`describe('WebhookDeliveriesFilters rows')`** – Single test block.
  - *`puts webhook-delivery-row on every row, event type included`* – Mounts the component with two deliveries, awaits render, then asserts (1) exactly two `[data-test=webhook-delivery-row]` elements exist and (2) each row's text contains the correct event type string.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** – Supplies `nextRenderTick`, a helper that resolves after Vue's microtask/render flush so DOM assertions run against the committed tree rather than the initial synchronous mount.

## Notes

- The `delivery` helper leaves optional fields absent; only the fields the component contract requires are populated. Add new required fields there when the `WebhookDelivery` type grows.
- Status is intentionally `'pending'`—this file tests *row presence and labeling*, not delivery lifecycle. Do not add status-conditional assertions here.
- The component is mounted with `vuetify` and `i18n` plugins (matching the app's global setup) but with empty `subscriptions` and `replayingIds`; the test is scoped to row rendering only.
