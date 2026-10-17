---
source: tests/support/unit/mounted-vm.ts
sha256: 9da5394a047bc11bb42fec362ee038134ba804c0d808892d39d1600474d06a84
generated_at: 2026-10-17T02:29:05.868983+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/mounted-vm.ts

## Purpose

Centralises the TypeScript cast from `wrapper.vm` (typed as `unknown` by `@vue/test-utils`) to `ComponentPublicInstance` in one place, so that individual spec files never repeat the unsafe cast and the project avoids enabling the `allowComponentTypeUnsafety` ESLint option.

## Key elements

- **`HasVm`** — Minimal structural interface (`vm: unknown`) that both `VueWrapper` and any object with a `vm` property satisfy; the accepted parameter type for both helpers.
- **`nextRenderTick(wrapper)`** — Returns `wrapper.vm.$nextTick()` after casting `vm` to `ComponentPublicInstance`. Used to await a DOM update in tests.
- **`emitOn(wrapper, event, …args)`** — Calls `wrapper.vm.$emit(event, …args)` after the same cast. Used to trigger a child component's `defineEmits` event directly when simulating a real DOM interaction is impractical or irrelevant.

## Relationships

Every spec file in the dependency graph imports one or both helpers from this module:

- **Orders specs** (`order-edit-view`, `order-view`, `orders-list-view`, `awaiting-transfer-table`) use `nextRenderTick` / `emitOn` to drive reactive updates or fire component events.
- **Cart specs** (`add-to-cart-button`, `cart-view`) use the same helpers for render-tick waits and event emission.
- **Delivery specs** (`fulfillment-order-card`, `hold-dialog`, `ship-items-dialog`, `shipment-panel`, `shipment-row`) rely on `emitOn` for dialog/panel events and `nextRenderTick` for async assertions.
- **Inventory specs** (`preorder-limit-dialog`, `preorders-board-view`), **Account** (`address-picker`), and **Locales** (`entries-import-dialog`) follow the same pattern.

No other production source file imports this module; it is test-support only.

## Notes

- The parameter type is the structural `HasVm`, **not** `VueWrapper`, so any object shape with a `vm` property is accepted. This keeps the helpers decoupled from a specific `@vue/test-utils` version's wrapper type.
- The cast is intentionally hidden behind named helpers rather than spread inline, mirroring the rationale of the `asStub<T>()` utility: one cast site instead of dozens of call-site casts.
- `arguments_` (trailing underscore) is used in `emitOn` to avoid shadowing the global `arguments` in strict-mode contexts; call sites should not expect a differently-named parameter.
