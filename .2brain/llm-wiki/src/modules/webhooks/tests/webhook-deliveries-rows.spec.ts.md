---
source: src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts
sha256: 4e03c8b31eb2eca0cab9263ea5e5f2151584a2f98ec0793ca82c3fe0df0ae520
signature: 51f549c16ff5f639280426d23ddbb6fa71b17166b0c878bfa910780ac8155c4d
generated_at: 2026-11-10T06:16:30.372399+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts

## Purpose

Vitest spec that verifies the delivery-row contract of `WebhookDeliveriesFilters.vue`: every rendered row exposes a stable `data-test` hook, displays its event type in accessible text, and respects the per-row `actions.replay` flag for the Replay control.

## Key elements

- **`delivery(id, eventType)`** – local factory that builds a minimal `WebhookDelivery` object (fixed `subscriptionId`, `attempt: 1`, `status: 'pending'`, `actions: { replay: true }`) so each test only overrides what it cares about.
- **`describe('WebhookDeliveriesFilters rows')`** – three `it` blocks:
  - *row data-test + event type in text*: mounts with two deliveries and asserts two `[data-test=webhook-delivery-row]` elements whose text contains the respective event name.
  - *Replay available on `in_flight`*: mounts a single in-flight delivery, confirms the Replay button is **not** disabled, clicks it, and asserts the `replay` emit carries the delivery id.
  - *Replay hidden when `actions.replay === false`*: mounts two deliveries (one replayable, one not) and asserts the button exists on row 0 but is absent on row 1.

## Relationships

- **`WebhookDeliveriesFilters.vue`** – the SUT mounted directly via `@vue/test-utils`. The spec reads its rendered DOM (`[data-test=…]` selectors) and listens for its `replay` emit.
- **`tests/support/unit/mounted-vm.ts`** – provides `nextRenderTick`, awaited after each `mount` to flush Vue's render cycle before querying the DOM.

## Notes

- The spec intentionally keeps delivery status at `'pending'` (or `'in_flight'`) because no broker runs in the unit-test environment; status is not the assertion target—row identity and replay availability are.
- `replayingIds` is always passed as an empty `Set<string>()`; the spec does not cover the "already replaying" state.
- The `data-test` attributes (`webhook-delivery-row`, `webhook-delivery-replay`) are the stable contract other specs and E2E tests rely on—renaming them in the component will break this file and any external consumers.
