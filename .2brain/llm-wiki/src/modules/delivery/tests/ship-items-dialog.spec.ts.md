---
source: src/modules/delivery/tests/ship-items-dialog.spec.ts
sha256: da02bfdd88ca573c99eeadcbd163bff480cc6bc6bb7842be244f888dc59dd02c
signature: cba33ac6885947f8c609d167d73fe11684678225af679014dd0d6772c7559616
generated_at: 2026-11-10T04:20:11.527015+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/ship-items-dialog.spec.ts

## Purpose

Vitest spec that mounts `ShipItemsDialog.vue` with `VDialog` stubbed to render inline and the delivery store's `ship` action spied. It verifies the user-facing contract of the shipping form: quantity defaults, submit gating, optional tracking-code handling, and error retention on refusal. Arithmetic correctness is explicitly deferred to `ship-lines.spec.ts`.

## Key elements

- **`SHIPPABLE`** – fixture: a `FulfillmentOrder` with one line, 2 units remaining, and `actions.ship: true`. Used as the default dialog target across all tests.
- **`openDialog(fulfillmentOrder)`** – helper that spies `useDeliveryStore().ship`, mounts the dialog with `modelValue: false`, then flips to `true` to trigger the re-seed transition. Returns `{ wrapper, ship }` for assertions.
- **`describe('the quantities')`** – three cases: defaults equal remaining units; typed values are forwarded as explicit lines to `ship` and emit `shipped` + close the dialog; exceeding remaining shows `[data-test=ship-lines-invalid]` and disables submit.
- **`describe('the tracking code')`** – optional on untracked methods (trimmed before being sent); on tracked methods the hint text appears but submit is *never* disabled.
- **`describe('a refusal')`** – when `ship` rejects, the error text renders in `[data-test=ship-items-error]`, no `shipped` event fires, and the dialog stays open (`update:modelValue` not emitted).
- **`beforeEach`** – resets Pinia (`setActivePinia(createPinia())`) and loads the `en` locale.

## Relationships

- **`ShipItemsDialog.vue`** – the component under test; imported and mounted directly.
- **`store.ts`** – `useDeliveryStore` is called to obtain the `ship` action that is spied/mocked in every test.
- **`fixtures.ts`** – supplies `aFulfillmentOrder` and `aShipment` used to build the `SHIPPABLE` fixture and the mock resolve value.
- **`mounted-vm.ts`** – `nextRenderTick` is awaited after form submission to let reactive updates settle before asserting.
- **`wire-modules.ts`** – `wireModulesIntoCore()` is called at module level to register Vuetify/i18n side-effects before any mount.

## Notes

- The dialog is always opened via a **prop flip** (`modelValue: false → true`), not by calling an internal method. Tests must use this transition because the form re-seeds quantities on open.
- `VDialog` is stubbed with a bare `<slot />` template; any dialog-specific Vuetify behaviour (transitions, teleport) is absent.
- The spec uses `data-test` selectors rather than CSS classes, so refactoring the component's styling won't break tests as long as those attributes remain.
- `ship` is spied on the **active Pinia instance** (created in `beforeEach`), not on a globally shared store—adding a test that creates its own Pinia mid-suite will silently break the spy.
